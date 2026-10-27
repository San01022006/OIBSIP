import * as paymentService from '../services/paymentService.js';
import { emitOrderUpdate } from '../sockets/orderSocket.js';
import ApiError from '../utils/ApiError.js';

export async function createOrder(req, res) {
  const session = await paymentService.createPaymentSession(req.body.orderId, req.user);
  res.json({ success: true, data: session });
}

export async function verify(req, res) {
  const result = await paymentService.verifyRazorpayPayment({ ...req.body, user: req.user });
  emitOrderUpdate(result.order, { paymentVerified: true });
  res.json({
    success: true,
    data: {
      order: result.order,
      duplicate: Boolean(result.duplicate),
      message: result.duplicate ? 'Payment already processed' : 'Payment verified successfully',
    },
  });
}

export async function verifyMock(req, res) {
  const result = await paymentService.verifyMockPayment({ ...req.body, user: req.user });
  emitOrderUpdate(result.order, { paymentVerified: true });
  res.json({ success: true, data: { order: result.order, duplicate: Boolean(result.duplicate) } });
}

export async function failed(req, res) {
  const order = await paymentService.recordFailedPayment({
    orderId: req.body.orderId,
    user: req.user,
    reason: req.body.reason,
  });
  if (order) emitOrderUpdate(order);
  res.json({ success: true, data: { order } });
}

export async function webhook(req, res) {
  const signature = req.get('x-razorpay-signature');
  if (!signature) throw ApiError.badRequest('Missing webhook signature');
  const result = await paymentService.processWebhook({
    rawBody: req.rawBody,
    signature,
    event: req.body,
  });
  res.json({ success: true, data: result });
}

export default { createOrder, verify, verifyMock, failed, webhook };
