import { Order } from '../models/Order.js';
import { Ingredient } from '../models/Ingredient.js';
import { Payment } from '../models/Payment.js';
import { InventoryMovement } from '../models/InventoryMovement.js';
import { NotificationLog } from '../models/NotificationLog.js';
import * as authService from '../services/authService.js';
import * as orderService from '../services/orderService.js';
import * as inventoryService from '../services/inventoryService.js';
import * as notificationService from '../services/notificationService.js';
import { runInventoryAlertCheck } from '../services/notificationService.js';
import { emitOrderUpdate } from '../sockets/orderSocket.js';
import { ORDER_STATUS, ROLES } from '../config/constants.js';
import ApiError from '../utils/ApiError.js';
import { getPagination, buildMeta } from '../utils/pagination.js';

export async function login(req, res) {
  const admin = await authService.authenticateAdmin(req.body);
  await authService.setAuthCookies(res, admin, 'admin');
  res.json({ success: true, data: { user: admin.toPublicJSON(), message: 'Admin signed in' } });
}

export async function refresh(req, res) {
  const raw = req.cookies?.[authService.ADMIN_REFRESH_COOKIE];
  if (!raw) throw ApiError.unauthorized('Session expired. Please sign in again.');
  const admin = await authService.refreshSession(raw);
  if (admin.role !== ROLES.ADMIN) throw ApiError.forbidden('You do not have permission to perform this action');
  await authService.setAuthCookies(res, admin, 'admin');
  res.json({ success: true, data: { user: admin.toPublicJSON() } });
}

export async function logout(req, res) {
  await authService.logout(req.user?._id);
  authService.clearAuthCookies(res, 'admin');
  res.json({ success: true, data: { message: 'Signed out' } });
}

export async function me(req, res) {
  res.json({ success: true, data: { user: req.user.toPublicJSON() } });
}

export async function dashboard(_req, res) {
  const [totalOrders, pendingOrders, inPreparation, completed, cancelled, lowStockCount, revenueAgg] =
    await Promise.all([
      Order.countDocuments(),
      Order.countDocuments({ status: { $in: [ORDER_STATUS.PAYMENT_PENDING, ORDER_STATUS.ORDER_RECEIVED] } }),
      Order.countDocuments({ status: ORDER_STATUS.IN_KITCHEN }),
      Order.countDocuments({ status: ORDER_STATUS.DELIVERED }),
      Order.countDocuments({ status: ORDER_STATUS.CANCELLED }),
      Ingredient.countDocuments({ available: true, $expr: { $lte: ['$stock', '$lowStockThreshold'] } }),
      Order.aggregate([
        { $match: { paymentStatus: 'paid' } },
        { $group: { _id: null, total: { $sum: '$pricing.total' } } },
      ]),
    ]);

  const [recentOrders, statusDistribution, lowStockItems] = await Promise.all([
    Order.find().sort({ createdAt: -1 }).limit(6).populate('user', 'name email').lean(),
    Order.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
    Ingredient.find({ available: true, $expr: { $lte: ['$stock', '$lowStockThreshold'] } })
      .sort({ stock: 1 })
      .limit(8)
      .lean(),
  ]);

  res.json({
    success: true,
    data: {
      summary: {
        totalOrders,
        pendingOrders,
        inPreparation,
        completed,
        cancelled,
        lowStockCount,
        revenue: revenueAgg[0]?.total || 0,
      },
      recentOrders,
      statusDistribution: statusDistribution.map((s) => ({ status: s._id, count: s.count })),
      lowStockItems,
    },
  });
}

export async function listOrders(req, res) {
  const { orders, meta } = await orderService.listOrdersForAdmin(req.query);
  res.json({ success: true, data: orders, meta });
}

export async function getOrder(req, res) {
  const order = await orderService.getOrderById(req.params.id);
  const payment = await Payment.findOne({ order: req.params.id }).select('-razorpaySignature').lean();
  const movements = await InventoryMovement.find({ order: req.params.id }).sort({ createdAt: 1 }).lean();
  res.json({ success: true, data: { order, payment, movements } });
}

export async function updateOrderStatus(req, res) {
  const order = await orderService.updateOrderStatus({
    orderId: req.params.id,
    status: req.body.status,
    actor: req.user,
    note: req.body.note,
  });
  emitOrderUpdate(order, { by: req.user.name });
  res.json({ success: true, data: { order } });
}

export async function listInventory(req, res) {
  const { page, limit, skip } = getPagination(req.query, { defaultLimit: 50, maxLimit: 200 });
  const filter = {};
  if (req.query.category && req.query.category !== 'all') filter.category = req.query.category;
  if (req.query.search) {
    const rx = new RegExp(req.query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.name = rx;
  }
  if (req.query.stockStatus === 'out') filter.stock = { $lte: 0 };
  if (req.query.stockStatus === 'low') {
    filter.stock = { $gt: 0 };
    filter.$expr = { $lte: ['$stock', '$lowStockThreshold'] };
  }
  if (req.query.stockStatus === 'healthy') {
    filter.$expr = { $gt: ['$stock', '$lowStockThreshold'] };
  }

  const [items, total] = await Promise.all([
    Ingredient.find(filter).sort({ category: 1, name: 1 }).skip(skip).limit(limit).lean(),
    Ingredient.countDocuments(filter),
  ]);
  res.json({ success: true, data: items, meta: buildMeta({ total, page, limit }) });
}

export async function updateInventory(req, res) {
  const item = await inventoryService.adjustStock({
    ingredientId: req.params.id,
    stock: req.body.stock,
    adjustment: req.body.adjustment,
    reason: req.body.reason,
    actor: req.user,
  });

  const extra = {};
  if (req.body.lowStockThreshold !== undefined) extra.lowStockThreshold = req.body.lowStockThreshold;
  if (req.body.available !== undefined) extra.available = req.body.available;
  if (req.body.priceAdjustment !== undefined) extra.priceAdjustment = req.body.priceAdjustment;

  let updated = item;
  if (Object.keys(extra).length) {
    updated = await Ingredient.findByIdAndUpdate(req.params.id, extra, { new: true });
  }
  res.json({ success: true, data: updated });
}

export async function listMovements(req, res) {
  const { page, limit, skip } = getPagination(req.query, { defaultLimit: 20, maxLimit: 100 });
  const filter = {};
  if (req.query.ingredient) filter.ingredient = req.query.ingredient;
  if (req.query.order) filter.order = req.query.order;

  const [movements, total] = await Promise.all([
    InventoryMovement.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    InventoryMovement.countDocuments(filter),
  ]);
  res.json({ success: true, data: movements, meta: buildMeta({ total, page, limit }) });
}

export async function inventoryAlerts(req, res) {
  const result = await runInventoryAlertCheck();
  res.json({ success: true, data: result });
}

export async function notificationLogs(_req, res) {
  const logs = await NotificationLog.find().sort({ lastNotifiedAt: -1 }).populate('ingredient', 'name category stock unit').lean();
  res.json({ success: true, data: logs });
}

export async function listCustomers(_req, res) {
  const customers = await Order.aggregate([
    { $group: { _id: '$user', orders: { $sum: 1 }, spent: { $sum: { $cond: [{ $eq: ['$paymentStatus', 'paid'] }, '$pricing.total', 0] } } } },
    { $sort: { orders: -1 } },
    { $limit: 20 },
  ]);
  res.json({ success: true, data: customers });
}

export const alertRecipient = () => notificationService.getAlertRecipient();

export default {
  login,
  logout,
  me,
  dashboard,
  listOrders,
  getOrder,
  updateOrderStatus,
  listInventory,
  updateInventory,
  listMovements,
  inventoryAlerts,
  notificationLogs,
};
