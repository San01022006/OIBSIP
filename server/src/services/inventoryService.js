import { Ingredient } from '../models/Ingredient.js';
import { InventoryMovement } from '../models/InventoryMovement.js';
import { Order } from '../models/Order.js';
import { MOVEMENT_TYPE } from '../config/constants.js';
import ApiError from '../utils/ApiError.js';
import { logger } from '../utils/logger.js';

/**
 * Aggregate the total required quantity of every ingredient for a list of
 * order items. Each configured ingredient consumes 1 unit per pizza.
 */
export function requiredQuantities(items) {
  const map = new Map();
  const add = (id, qty) => {
    const key = String(id);
    map.set(key, (map.get(key) || 0) + qty);
  };
  for (const item of items) {
    const qty = item.quantity;
    const c = item.configuration;
    add(c.base.ingredient, qty);
    add(c.sauce.ingredient, qty);
    add(c.cheese.ingredient, qty);
    for (const veg of c.vegetables || []) add(veg.ingredient, qty);
  }
  return map;
}

/**
 * Atomically reserve stock for an order. If ANY ingredient cannot be reserved
 * the entire reservation is rolled back so no partial deduction remains.
 * Returns the list of reserved { ingredient, quantity } pairs.
 */
export async function reserveStock(items, orderRef, actorName = 'system') {
  const required = requiredQuantities(items);
  const reserved = [];
  const movements = [];

  try {
    for (const [ingredientId, quantity] of required) {
      const updated = await Ingredient.findOneAndUpdate(
        { _id: ingredientId, stock: { $gte: quantity }, available: true },
        { $inc: { stock: -quantity }, $set: { lastUpdatedAt: new Date() } },
        { new: true }
      );
      if (!updated) {
        const ing = await Ingredient.findById(ingredientId).lean();
        const label = ing ? ing.name : 'ingredient';
        throw ApiError.conflict(
          ing
            ? `Not enough stock for ${label}. Only ${ing.stock} ${ing.unit} left.`
            : `Ingredient ${label} is no longer available.`
        );
      }
      reserved.push({ ingredient: updated._id, quantity });
      movements.push({
        ingredient: updated._id,
        ingredientName: updated.name,
        category: updated.category,
        type: MOVEMENT_TYPE.DEDUCTION,
        change: -quantity,
        balanceAfter: updated.stock,
        reason: `Reserved for order ${orderRef}`,
        order: orderRef,
        actorName,
      });
    }
  } catch (err) {
    // Roll back everything reserved so far.
    for (const r of reserved) {
      await Ingredient.updateOne({ _id: r.ingredient }, { $inc: { stock: r.quantity } });
    }
    logger.warn(`[inventory] Reservation rolled back for order ${orderRef}: ${err.message}`);
    throw err;
  }

  await InventoryMovement.insertMany(movements);
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
  await Order.updateOne(
    { _id: orderRef },
    { $set: { reservation: { active: true, items: reserved, expiresAt } } }
  );
  return { reserved, expiresAt };
}

/**
 * Release an active reservation, restoring stock exactly once.
 * Idempotent: the atomic status flip guarantees a single restoration.
 */
export async function releaseReservation(orderId, { reason = 'Reservation released', type = MOVEMENT_TYPE.RESERVATION_RELEASE, actorName = 'system' } = {}) {
  const claimed = await Order.findOneAndUpdate(
    { _id: orderId, 'reservation.active': true, inventoryDeducted: false },
    { $set: { 'reservation.active': false } },
    { new: true }
  );
  if (!claimed) return { released: false };

  const items = claimed.reservation?.items || [];
  const movements = [];
  for (const item of items) {
    const updated = await Ingredient.findByIdAndUpdate(
      item.ingredient,
      { $inc: { stock: item.quantity }, $set: { lastUpdatedAt: new Date() } },
      { new: true }
    );
    if (updated) {
      movements.push({
        ingredient: updated._id,
        ingredientName: updated.name,
        category: updated.category,
        type,
        change: item.quantity,
        balanceAfter: updated.stock,
        reason: `${reason} (${claimed.orderNumber})`,
        order: claimed._id,
        actorName,
      });
    }
  }
  if (movements.length) await InventoryMovement.insertMany(movements);
  return { released: true, items };
}

/**
 * Convert an active reservation into committed inventory. This is the
 * idempotency gate for payment: only the first caller succeeds.
 */
export async function consumeReservation(orderId) {
  const claimed = await Order.findOneAndUpdate(
    { _id: orderId, 'reservation.active': true, inventoryDeducted: false },
    { $set: { 'reservation.active': false, inventoryDeducted: true } },
    { new: true }
  );
  return Boolean(claimed);
}

/** Verify that every ingredient currently has enough stock (pre-flight check). */
export async function checkAvailability(items) {
  const required = requiredQuantities(items);
  const ids = [...required.keys()];
  const ingredients = await Ingredient.find({ _id: { $in: ids } });
  const byId = new Map(ingredients.map((i) => [String(i._id), i]));
  const problems = [];

  for (const [id, qty] of required) {
    const ing = byId.get(id);
    if (!ing) {
      problems.push({ ingredient: id, message: 'Ingredient not found' });
    } else if (!ing.available) {
      problems.push({ ingredient: id, name: ing.name, message: `${ing.name} is unavailable` });
    } else if (ing.stock < qty) {
      problems.push({
        ingredient: id,
        name: ing.name,
        message: `${ing.name} is out of stock (need ${qty}, have ${ing.stock})`,
      });
    }
  }
  return { ok: problems.length === 0, problems };
}

/** Admin manual stock adjustment (absolute or delta). Records an audit movement. */
export async function adjustStock({ ingredientId, stock, adjustment, reason, actor }) {
  const ingredient = await Ingredient.findById(ingredientId);
  if (!ingredient) throw ApiError.notFound('Ingredient not found');

  const current = ingredient.stock;
  let next = current;
  if (typeof stock === 'number') next = stock;
  else if (typeof adjustment === 'number') next = current + adjustment;

  if (next < 0) throw ApiError.badRequest('Stock cannot be negative');

  const delta = next - current;
  ingredient.stock = next;
  ingredient.lastUpdatedAt = new Date();
  await ingredient.save();

  if (delta !== 0) {
    await InventoryMovement.create({
      ingredient: ingredient._id,
      ingredientName: ingredient.name,
      category: ingredient.category,
      type: delta > 0 ? MOVEMENT_TYPE.RESTOCK : MOVEMENT_TYPE.MANUAL_ADJUSTMENT,
      change: delta,
      balanceAfter: next,
      reason: reason || (delta > 0 ? 'Manual restock' : 'Manual adjustment'),
      actor: actor?._id || null,
      actorName: actor?.name || 'admin',
    });
  }

  return ingredient;
}

/** Release reservations that expired while payment was still pending. */
export async function releaseExpiredReservations() {
  const stale = await Order.find({
    'reservation.active': true,
    inventoryDeducted: false,
    paymentStatus: { $ne: 'paid' },
    'reservation.expiresAt': { $lt: new Date() },
  }).limit(50);

  let released = 0;
  for (const order of stale) {
    const result = await releaseReservation(order._id, { reason: 'Reservation expired' });
    if (result.released) released += 1;
  }
  return { checked: stale.length, released };
}

export default {
  requiredQuantities,
  reserveStock,
  releaseReservation,
  consumeReservation,
  checkAvailability,
  adjustStock,
  releaseExpiredReservations,
};
