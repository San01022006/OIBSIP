import { z } from 'zod';

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid identifier');

export const createOrderPaymentSchema = z.object({
  orderId: objectId,
});

export const verifyPaymentSchema = z.object({
  orderId: objectId,
  razorpayOrderId: z.string().trim().min(1),
  razorpayPaymentId: z.string().trim().min(1),
  razorpaySignature: z.string().trim().min(1),
});

export const failedPaymentSchema = z.object({
  orderId: objectId,
  reason: z.string().trim().max(300).optional().default('Payment failed'),
});

export const mockPaymentSchema = z.object({
  orderId: objectId,
  token: z.string().trim().min(10),
});

export default { createOrderPaymentSchema, verifyPaymentSchema };
