import * as orderService from '../services/orderService.js';
import { emitOrderUpdate } from '../sockets/orderSocket.js';
import ApiError from '../utils/ApiError.js';

export async function previewOrder(req, res) {
  const result = await orderService.previewOrder(req.body.items);
  res.json({ success: true, data: result });
}

export async function createOrder(req, res) {
  const order = await orderService.createOrder({
    user: req.user,
    items: req.body.items,
    delivery: req.body.delivery,
    note: req.body.note,
  });
  emitOrderUpdate(order);
  res.status(201).json({ success: true, data: { order } });
}

export async function myOrders(req, res) {
  const { orders, meta } = await orderService.getMyOrders(req.user, req.query);
  res.json({ success: true, data: orders, meta });
}

export async function getOrder(req, res) {
  const result = await orderService.getOrderForUser(req.user, req.params.id);
  res.json({ success: true, data: result });
}

export async function cancelOrder(req, res) {
  const order = await orderService.getOrderById(req.params.id);
  if (!order) throw ApiError.notFound('Order not found');
  if (String(order.user) !== String(req.user._id)) throw ApiError.forbidden('Not your order');
  const updated = await orderService.cancelOrder({
    order,
    actor: req.user,
    byRole: 'customer',
    reason: req.body.reason || 'Cancelled by customer',
  });
  emitOrderUpdate(updated);
  res.json({ success: true, data: { order: updated } });
}

export default { previewOrder, createOrder, myOrders, getOrder, cancelOrder };
