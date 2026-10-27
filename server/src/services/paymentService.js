import crypto from 'node:crypto';
import Razorpay from 'razorpay';
import { env } from '../config/env.js';
import { PAYMENT_STATUS, PAYMENT_PROVIDER } from '../config/constants.js';
import { Order } from '../models/Order.js';
import { Payment } from '../models/Payment.js';
import ApiError from '../utils/ApiError.js';
import { hmacSha256, safeEqual } from '../utils/crypto.js';
import { logger } from '../utils/logger.js';
import * as orderService from './orderService.js';

let razorpayClient = null;

export function isRazorpayConfigured() {
  return env.razorpay.configured;
}

function getRazorpay() {
  if (!isRazorpayConfigured()) {
    throw ApiError.serviceUnavailable(
      'Razorpay is not configured on the server. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.'
    );
  }
  if (!razorpayClient) {
    razorpayClient = new Razorpay({
      key_id: env.razorpay.keyId,
      key_secret: env.razorpay.keySecret,
    });
  }
  return razorpayClient;
}

/** Razorpay's documented signature: HMAC_SHA256(order_id + "|" + payment_id, secret). */
export function computeRazorpaySignature(razorpayOrderId, razorpayPaymentId, secret = env.razorpay.keySecret) {
  return hmacSha256(`${razorpayOrderId}|${razorpayPaymentId}`, secret);
}

export function verifyRazorpaySignature(razorpayOrderId, razorpayPaymentId, signature, secret = env.razorpay.keySecret) {
  if (!signature || !secret) return false;
  const expected = computeRazorpaySignature(razorpayOrderId, razorpayPaymentId, secret);
  return safeEqual(expected, signature);
}

export function verifyWebhookSignature(rawBody, signature, secret = env.razorpay.webhookSecret) {
  if (!signature || !secret) return false;
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  return safeEqual(expected, signature);
}

async function loadOwnedOrder(orderId, user) {
  const order = await Order.findById(orderId);
  if (!order) throw ApiError.notFound('Order not found');
  if (String(order.user) !== String(user._id)) throw ApiError.forbidden('You can only pay for your own orders');
  return order;
}

/**
 * Create a payment session for a pending order.
 * - Real Razorpay order when credentials are configured.
 * - A clearly labelled local "mock" provider when ENABLE_MOCK_PAYMENTS=true.
 *   This is NOT Razorpay and never fakes a real Razorpay charge.
 */
export async function createPaymentSession(orderId, user) {
  const order = await loadOwnedOrder(orderId, user);
  if (order.paymentStatus === PAYMENT_STATUS.PAID) {
    throw ApiError.conflict('This order has already been paid');
  }
  const amountPaise = Math.round(order.pricing.total * 100);

  if (isRazorpayConfigured()) {
    const client = getRazorpay();
    const rzpOrder = await client.orders.create({
      amount: amountPaise,
      currency: 'INR',
      receipt: order.orderNumber,
      notes: { orderId: String(order._id), orderNumber: order.orderNumber },
    });

    await Payment.findOneAndUpdate(
      { order: order._id },
      {
        $set: {
          user: user._id,
          provider: PAYMENT_PROVIDER.RAZORPAY,
          razorpayOrderId: rzpOrder.id,
          amount: order.pricing.total,
          currency: 'INR',
          status: PAYMENT_STATUS.PENDING,
          isMock: false,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return {
      provider: PAYMENT_PROVIDER.RAZORPAY,
      keyId: env.razorpay.keyId,
      razorpayOrderId: rzpOrder.id,
      amount: amountPaise,
      currency: 'INR',
      orderNumber: order.orderNumber,
      mock: false,
    };
  }

  if (env.enableMockPayments) {
    const exp = Date.now() + 15 * 60 * 1000;
    const token = buildMockToken(order._id, order.pricing.total, exp);
    await Payment.findOneAndUpdate(
      { order: order._id },
      {
        $set: {
          user: user._id,
          provider: PAYMENT_PROVIDER.MOCK,
          amount: order.pricing.total,
          currency: 'INR',
          status: PAYMENT_STATUS.PENDING,
          isMock: true,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    return {
      provider: PAYMENT_PROVIDER.MOCK,
      amount: amountPaise,
      currency: 'INR',
      orderNumber: order.orderNumber,
      mock: true,
      mockToken: token,
    };
  }

  throw ApiError.serviceUnavailable(
    'Online payments are not configured. Set Razorpay keys (or enable ENABLE_MOCK_PAYMENTS for local testing).'
  );
}

function buildMockToken(orderId, amount, exp) {
  const payload = `${orderId}.${amount}.${exp}`;
  const sig = hmacSha256(payload, env.jwtSecret);
  return Buffer.from(`${payload}.${sig}`).toString('base64url');
}

function parseMockToken(token) {
  const decoded = Buffer.from(token, 'base64url').toString('utf8');
  const parts = decoded.split('.');
  if (parts.length !== 4) return null;
  const [orderId, amount, exp, sig] = parts;
  const expected = hmacSha256(`${orderId}.${amount}.${exp}`, env.jwtSecret);
  if (!safeEqual(expected, sig)) return null;
  if (Number(exp) < Date.now()) return null;
  return { orderId, amount: Number(amount), exp: Number(exp) };
}

/** Shared finalisation — records the Payment document then deduces inventory once. */
async function finalizePayment({ order, provider, razorpayOrderId, razorpayPaymentId, signature, method, isMock, eventId }) {
  // Deduplicate by payment id where available.
  if (razorpayPaymentId) {
    const existing = await Payment.findOne({ razorpayPaymentId });
    if (existing && existing.verified) {
      const current = await Order.findById(order._id);
      return { order: current, duplicate: true };
    }
  }

  const paymentUpdate = {
    user: order.user,
    provider,
    razorpayOrderId: razorpayOrderId || null,
    razorpayPaymentId: razorpayPaymentId || null,
    amount: order.pricing.total,
    currency: 'INR',
    status: PAYMENT_STATUS.PAID,
    verified: true,
    verifiedAt: new Date(),
    method: method || (isMock ? 'mock' : 'razorpay'),
    isMock: Boolean(isMock),
  };

  await Payment.findOneAndUpdate(
    { order: order._id },
    {
      $set: paymentUpdate,
      ...(eventId ? { $addToSet: { processedWebhookEvents: eventId } } : {}),
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  const { order: paidOrder, firstTime } = await orderService.markOrderPaid(order._id, {
    paymentContext: { idempotencyKey: razorpayPaymentId || `mock_${order._id}` },
  });

  return { order: paidOrder, duplicate: !firstTime };
}

/** Verify a real Razorpay checkout response server-side. */
export async function verifyRazorpayPayment({ orderId, razorpayOrderId, razorpayPaymentId, razorpaySignature, user }) {
  const order = await loadOwnedOrder(orderId, user);

  // Idempotent: a duplicate verification returns the already-paid order.
  if (order.paymentStatus === PAYMENT_STATUS.PAID) return { order, duplicate: true };

  if (!isRazorpayConfigured()) {
    throw ApiError.serviceUnavailable('Razorpay is not configured on the server.');
  }

  const record = await Payment.findOne({ order: order._id });
  if (record?.razorpayOrderId && record.razorpayOrderId !== razorpayOrderId) {
    throw ApiError.badRequest('Payment does not belong to this order');
  }

  if (!verifyRazorpaySignature(razorpayOrderId, razorpayPaymentId, razorpaySignature)) {
    logger.warn(`[payment] Signature verification failed for order ${order.orderNumber}`);
    throw ApiError.badRequest('Payment signature verification failed');
  }

  // Confirm the payment with Razorpay and check the amount matches.
  try {
    const client = getRazorpay();
    const payment = await client.payments.fetch(razorpayPaymentId);
    if (payment.order_id && payment.order_id !== razorpayOrderId) {
      throw ApiError.badRequest('Payment order mismatch');
    }
    if (typeof payment.amount === 'number' && payment.amount !== Math.round(order.pricing.total * 100)) {
      throw ApiError.badRequest('Payment amount does not match the order total');
    }
  } catch (err) {
    if (err instanceof ApiError) throw err;
    // Network failure talking to Razorpay: signature already proved authenticity.
    logger.warn(`[payment] Could not fetch payment ${razorpayPaymentId}: ${err.message}`);
  }

  return finalizePayment({
    order,
    provider: PAYMENT_PROVIDER.RAZORPAY,
    razorpayOrderId,
    razorpayPaymentId,
    signature: razorpaySignature,
    isMock: false,
  });
}

/** Verify a local mock payment token (development only). */
export async function verifyMockPayment({ orderId, token, user }) {
  if (!env.enableMockPayments) {
    throw ApiError.serviceUnavailable('Mock payments are disabled.');
  }
  const order = await loadOwnedOrder(orderId, user);
  if (order.paymentStatus === PAYMENT_STATUS.PAID) return { order, duplicate: true };
  const parsed = parseMockToken(token);
  if (!parsed || parsed.orderId !== String(order._id) || parsed.amount !== order.pricing.total) {
    throw ApiError.badRequest('Invalid or expired mock payment token');
  }
  return finalizePayment({
    order,
    provider: PAYMENT_PROVIDER.MOCK,
    razorpayPaymentId: `mock_${order._id}_${parsed.exp}`,
    isMock: true,
    method: 'mock',
  });
}

export async function recordFailedPayment({ orderId, user, reason }) {
  const order = await loadOwnedOrder(orderId, user);
  if (order.paymentStatus === PAYMENT_STATUS.PAID) return null; // already paid, never revert
  await Payment.findOneAndUpdate(
    { order: order._id },
    { $set: { status: PAYMENT_STATUS.FAILED, failureReason: reason || 'Payment failed' } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  return orderService.markOrderPaymentFailed(order._id, reason);
}

/**
 * Process a Razorpay webhook. Verifies the signature, deduplicates events and
 * updates the order state. Never processes the same event twice.
 */
export async function processWebhook({ rawBody, signature, event }) {
  if (!env.razorpay.webhookSecret) {
    throw ApiError.serviceUnavailable('Webhook secret is not configured');
  }
  if (!verifyWebhookSignature(rawBody, signature)) {
    throw ApiError.badRequest('Invalid webhook signature');
  }
  if (!event?.event || !event?.payload) throw ApiError.badRequest('Malformed webhook payload');

  const eventId = event.id || `${event.event}:${event.payload?.payment?.entity?.id || Date.now()}`;

  // Global event dedupe: store the event id on the payment/order when applied.
  const paymentEntity = event.payload?.payment?.entity;
  const rzpOrderId = paymentEntity?.order_id;

  if (event.event === 'payment.captured' || event.event === 'payment.authorized') {
    const localPayment = rzpOrderId ? await Payment.findOne({ razorpayOrderId: rzpOrderId }) : null;
    if (!localPayment) {
      logger.warn(`[webhook] No local payment for Razorpay order ${rzpOrderId}; ignoring ${event.event}`);
      return { handled: false, reason: 'unknown_order' };
    }
    if (localPayment.processedWebhookEvents.includes(eventId)) {
      return { handled: true, duplicate: true };
    }
    const order = await Order.findById(localPayment.order);
    if (!order || order.paymentStatus === PAYMENT_STATUS.PAID) {
      return { handled: true, duplicate: true };
    }
    await finalizePayment({
      order,
      provider: PAYMENT_PROVIDER.RAZORPAY,
      razorpayOrderId: rzpOrderId,
      razorpayPaymentId: paymentEntity.id,
      isMock: false,
      method: paymentEntity.method,
      eventId,
    });
    await Payment.updateOne({ _id: localPayment._id }, { $addToSet: { processedWebhookEvents: eventId } });
    return { handled: true };
  }

  if (event.event === 'payment.failed') {
    const localPayment = rzpOrderId ? await Payment.findOne({ razorpayOrderId: rzpOrderId }) : null;
    if (!localPayment) return { handled: false, reason: 'unknown_order' };
    if (localPayment.processedWebhookEvents.includes(eventId)) return { handled: true, duplicate: true };
    const order = await Order.findById(localPayment.order);
    if (order && order.paymentStatus !== PAYMENT_STATUS.PAID) {
      await orderService.markOrderPaymentFailed(order._id, paymentEntity?.error_description || 'Payment failed');
    }
    await Payment.updateOne({ _id: localPayment._id }, { $addToSet: { processedWebhookEvents: eventId } });
    return { handled: true };
  }

  return { handled: false, reason: 'unhandled_event' };
}

export default {
  isRazorpayConfigured,
  createPaymentSession,
  verifyRazorpayPayment,
  verifyMockPayment,
  recordFailedPayment,
  processWebhook,
  verifyRazorpaySignature,
  verifyWebhookSignature,
};
