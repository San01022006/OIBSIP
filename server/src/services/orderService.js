import crypto from 'node:crypto';
import { env } from '../config/env.js';
import {
  ORDER_STATUS,
  PAYMENT_STATUS,
  ALLOWED_TRANSITIONS,
  MOVEMENT_TYPE,
} from '../config/constants.js';
import { Order } from '../models/Order.js';
import { Payment } from '../models/Payment.js';
import { Ingredient } from '../models/Ingredient.js';
import { Pizza } from '../models/Pizza.js';
import ApiError from '../utils/ApiError.js';
import { getPagination, buildMeta } from '../utils/pagination.js';
import * as inventoryService from './inventoryService.js';

const round2 = (n) => Math.round(n * 100) / 100;
const roundRupee = (n) => Math.round(n);

function generateOrderNumber() {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  const rand = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `CC-${ymd}-${rand}`;
}

const CATEGORY_FOR_ROLE = { base: 'base', sauce: 'sauce', cheese: 'cheese' };

/**
 * Resolve a client configuration against trusted database values.
 * Returns ingredient names and prices taken from MongoDB — client values for
 * names/prices are ignored entirely.
 */
export async function resolveConfiguration(configuration) {
  const vegInputs = configuration.vegetables || [];
  const ids = [
    configuration.base.ingredient,
    configuration.sauce.ingredient,
    configuration.cheese.ingredient,
    ...vegInputs.map((v) => v.ingredient),
  ];
  const ingredients = await Ingredient.find({ _id: { $in: ids } });
  const byId = new Map(ingredients.map((i) => [String(i._id), i]));

  const pick = (ref, role) => {
    const ing = byId.get(String(ref.ingredient));
    if (!ing) throw ApiError.badRequest(`Unknown ${role} ingredient`);
    if (ing.category !== CATEGORY_FOR_ROLE[role]) {
      throw ApiError.badRequest(`Selected ${role} is not a valid ${role} option`);
    }
    return { ingredient: ing._id, name: ing.name, price: ing.priceAdjustment };
  };

  const resolved = {
    base: pick(configuration.base, 'base'),
    sauce: pick(configuration.sauce, 'sauce'),
    cheese: pick(configuration.cheese, 'cheese'),
    vegetables: [],
  };

  const seen = new Set();
  for (const veg of vegInputs) {
    const ing = byId.get(String(veg.ingredient));
    if (!ing) throw ApiError.badRequest('Unknown vegetable ingredient');
    if (ing.category !== 'vegetable') throw ApiError.badRequest('Selected item is not a vegetable');
    if (seen.has(String(ing._id))) continue; // ignore duplicates
    seen.add(String(ing._id));
    resolved.vegetables.push({ ingredient: ing._id, name: ing.name, price: ing.priceAdjustment });
  }

  return resolved;
}

export function computeUnitPrice(configuration) {
  const vegTotal = configuration.vegetables.reduce((sum, v) => sum + v.price, 0);
  return roundRupee(
    env.pricing.basePrice +
      configuration.base.price +
      configuration.sauce.price +
      configuration.cheese.price +
      vegTotal
  );
}

export function computeTotals(items) {
  const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
  const deliveryFee =
    subtotal === 0 || subtotal >= env.pricing.freeDeliveryThreshold ? 0 : env.pricing.deliveryFee;
  const tax = roundRupee(subtotal * env.pricing.taxRate);
  const total = subtotal + deliveryFee + tax;
  return {
    subtotal: round2(subtotal),
    deliveryFee,
    taxRate: env.pricing.taxRate,
    tax,
    total: round2(total),
    currency: 'INR',
  };
}

/** Build the trusted, priced item list from a client payload. */
async function buildItems(itemsInput) {
  const items = [];
  for (const raw of itemsInput) {
    const configuration = await resolveConfiguration(raw.configuration);
    let name = 'Custom Pizza';
    if (raw.pizza) {
      const pizza = await Pizza.findById(raw.pizza).lean();
      if (pizza) name = pizza.name;
    }
    const unitPrice = computeUnitPrice(configuration);
    items.push({
      pizza: raw.pizza || null,
      name,
      quantity: raw.quantity,
      unitPrice,
      lineTotal: round2(unitPrice * raw.quantity),
      configuration,
    });
  }
  return items;
}

/** Preview endpoint: returns trusted pricing without persisting anything. */
export async function previewOrder(itemsInput) {
  const items = await buildItems(itemsInput);
  const availability = await inventoryService.checkAvailability(items);
  const pricing = computeTotals(items);
  return { items, pricing, availability };
}

export async function createOrder({ user, items: itemsInput, delivery, note = '' }) {
  const items = await buildItems(itemsInput);

  const availability = await inventoryService.checkAvailability(items);
  if (!availability.ok) {
    throw ApiError.conflict('Some ingredients are unavailable', availability.problems);
  }

  const pricing = computeTotals(items);
  const order = await Order.create({
    orderNumber: generateOrderNumber(),
    user: user._id,
    items,
    delivery,
    pricing,
    note,
    paymentStatus: PAYMENT_STATUS.PENDING,
    status: ORDER_STATUS.PAYMENT_PENDING,
    statusHistory: [
      { status: ORDER_STATUS.PAYMENT_PENDING, byRole: 'customer', by: user._id, note: 'Order created' },
    ],
  });

  try {
    await inventoryService.reserveStock(items, order._id, user.name);
  } catch (err) {
    await Order.deleteOne({ _id: order._id });
    throw err;
  }

  return Order.findById(order._id);
}

export async function getMyOrders(user, query) {
  const { page, limit, skip } = getPagination(query);
  const filter = { user: user._id };
  if (query.status && query.status !== 'all') filter.status = query.status;
  if (query.paymentStatus && query.paymentStatus !== 'all') filter.paymentStatus = query.paymentStatus;

  const [orders, total] = await Promise.all([
    Order.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Order.countDocuments(filter),
  ]);
  return { orders, meta: buildMeta({ total, page, limit }) };
}

export async function getOrderForUser(user, orderId) {
  const order = await Order.findById(orderId).lean();
  if (!order) throw ApiError.notFound('Order not found');
  if (String(order.user) !== String(user._id)) {
    throw ApiError.forbidden('You can only view your own orders');
  }
  const payment = await Payment.findOne({ order: orderId })
    .select('-razorpaySignature')
    .lean();
  return { order, payment };
}

export async function getOrderById(orderId) {
  const order = await Order.findById(orderId).lean();
  if (!order) throw ApiError.notFound('Order not found');
  return order;
}

/**
 * Mark an order paid exactly once. Returns { order, firstTime }.
 * The atomic paymentStatus flip is the idempotency gate.
 */
export async function markOrderPaid(orderId, { paymentContext = {}, actorName = 'system' } = {}) {
  const updated = await Order.findOneAndUpdate(
    { _id: orderId, paymentStatus: { $ne: PAYMENT_STATUS.PAID } },
    {
      $set: {
        paymentStatus: PAYMENT_STATUS.PAID,
        status: ORDER_STATUS.ORDER_RECEIVED,
        paymentIdempotencyKey: paymentContext.idempotencyKey || null,
      },
      $push: {
        statusHistory: {
          status: ORDER_STATUS.ORDER_RECEIVED,
          byRole: 'system',
          note: 'Payment verified',
        },
      },
    },
    { new: true }
  );

  if (!updated) {
    // Already paid — idempotent success, do not deduct again.
    const existing = await Order.findById(orderId);
    if (!existing) throw ApiError.notFound('Order not found');
    return { order: existing, firstTime: false };
  }

  // Commit the reservation (inventoryDeducted flag flip) exactly once.
  const consumed = await inventoryService.consumeReservation(orderId);
  if (!consumed) {
    // Reservation may have expired and been released — try a fresh reservation.
    const avail = await inventoryService.checkAvailability(updated.items);
    if (avail.ok) {
      await inventoryService.reserveStock(updated.items, orderId, actorName);
      await inventoryService.consumeReservation(orderId);
    } else {
      updated.note = `${updated.note} | Manual review: paid but stock unavailable`.trim();
      await updated.save();
    }
  }
  return { order: updated, firstTime: true };
}

export async function markOrderPaymentFailed(orderId, reason = 'Payment failed') {
  const order = await Order.findByIdAndUpdate(
    orderId,
    {
      $set: { paymentStatus: PAYMENT_STATUS.FAILED, status: ORDER_STATUS.PAYMENT_FAILED },
      $push: {
        statusHistory: { status: ORDER_STATUS.PAYMENT_FAILED, byRole: 'system', note: reason },
      },
    },
    { new: true }
  );
  if (!order) throw ApiError.notFound('Order not found');
  await inventoryService.releaseReservation(orderId, { reason: 'Payment failed' });
  return order;
}

export async function cancelOrder({ order, actor, byRole = 'customer', reason = 'Cancelled' }) {
  if ([ORDER_STATUS.CANCELLED, ORDER_STATUS.DELIVERED].includes(order.status)) {
    throw ApiError.badRequest(`Order is already ${order.status}`);
  }
  if (order.paymentStatus === PAYMENT_STATUS.PAID) {
    // Paid orders need an explicit audited cancellation/refund workflow.
    await inventoryService.releaseReservation(order._id, {
      reason: 'Order cancelled after payment — stock restored',
      type: MOVEMENT_TYPE.RESTOCK,
      actorName: actor?.name || byRole,
    });
  } else {
    await inventoryService.releaseReservation(order._id, { reason: 'Order cancelled' });
  }

  const updated = await Order.findByIdAndUpdate(
    order._id,
    {
      $set: { status: ORDER_STATUS.CANCELLED },
      $push: {
        statusHistory: {
          status: ORDER_STATUS.CANCELLED,
          by: actor?._id || null,
          byRole,
          note: reason,
        },
      },
    },
    { new: true }
  );
  return updated;
}

/** Validate and apply an admin status transition. */
export async function updateOrderStatus({ orderId, status, actor, note = '' }) {
  const order = await Order.findById(orderId);
  if (!order) throw ApiError.notFound('Order not found');

  if (order.status === status) return order;

  const allowed = ALLOWED_TRANSITIONS[order.status] || [];
  if (!allowed.includes(status)) {
    throw ApiError.badRequest(`Cannot change status from "${order.status}" to "${status}"`);
  }
  if (status === ORDER_STATUS.CANCELLED) {
    return cancelOrder({ order, actor, byRole: 'admin', reason: note || 'Cancelled by admin' });
  }

  order.status = status;
  order.statusHistory.push({ status, by: actor?._id || null, byRole: 'admin', note });
  await order.save();
  return order;
}

export async function listOrdersForAdmin(query) {
  const { page, limit, skip } = getPagination(query);
  const filter = {};
  if (query.status && query.status !== 'all') filter.status = query.status;
  if (query.paymentStatus && query.paymentStatus !== 'all') filter.paymentStatus = query.paymentStatus;
  if (query.search) {
    const rx = new RegExp(query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ orderNumber: rx }, { 'delivery.name': rx }, { 'delivery.phone': rx }];
  }

  const [orders, total] = await Promise.all([
    Order.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).populate('user', 'name email').lean(),
    Order.countDocuments(filter),
  ]);
  return { orders, meta: buildMeta({ total, page, limit }) };
}

export default {
  resolveConfiguration,
  computeUnitPrice,
  computeTotals,
  previewOrder,
  createOrder,
  getMyOrders,
  getOrderForUser,
  getOrderById,
  markOrderPaid,
  markOrderPaymentFailed,
  cancelOrder,
  updateOrderStatus,
  listOrdersForAdmin,
};
