import mongoose from 'mongoose';
import { PAYMENT_STATUS_VALUES, PAYMENT_STATUS, PAYMENT_PROVIDER } from '../config/constants.js';

const paymentSchema = new mongoose.Schema(
  {
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    provider: {
      type: String,
      enum: Object.values(PAYMENT_PROVIDER),
      default: PAYMENT_PROVIDER.RAZORPAY,
    },
    razorpayOrderId: { type: String, default: null, index: true },
    razorpayPaymentId: { type: String, default: null },
    razorpaySignature: { type: String, default: null, select: false },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'INR' },
    status: {
      type: String,
      enum: PAYMENT_STATUS_VALUES,
      default: PAYMENT_STATUS.PENDING,
      index: true,
    },
    verified: { type: Boolean, default: false },
    method: { type: String, default: null },
    failureReason: { type: String, default: null },
    // Persisted webhook event ids prevent double processing.
    processedWebhookEvents: { type: [String], default: [] },
    verifiedAt: { type: Date, default: null },
    isMock: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// A single Razorpay payment id may only ever be recorded once.
paymentSchema.index(
  { razorpayPaymentId: 1 },
  { unique: true, partialFilterExpression: { razorpayPaymentId: { $type: 'string' } } }
);

export const Payment = mongoose.model('Payment', paymentSchema);
export default Payment;
