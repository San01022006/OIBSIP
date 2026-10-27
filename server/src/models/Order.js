import mongoose from 'mongoose';
import { ORDER_STATUS_VALUES, ORDER_STATUS, PAYMENT_STATUS_VALUES, PAYMENT_STATUS } from '../config/constants.js';

const selectedIngredientSchema = new mongoose.Schema(
  {
    ingredient: { type: mongoose.Schema.Types.ObjectId, ref: 'Ingredient', required: true },
    name: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const configurationSchema = new mongoose.Schema(
  {
    base: { type: selectedIngredientSchema, required: true },
    sauce: { type: selectedIngredientSchema, required: true },
    cheese: { type: selectedIngredientSchema, required: true },
    vegetables: { type: [selectedIngredientSchema], default: [] },
  },
  { _id: false }
);

const orderItemSchema = new mongoose.Schema(
  {
    pizza: { type: mongoose.Schema.Types.ObjectId, ref: 'Pizza', default: null },
    name: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1, max: 20 },
    unitPrice: { type: Number, required: true, min: 0 },
    lineTotal: { type: Number, required: true, min: 0 },
    configuration: { type: configurationSchema, required: true },
  },
  { _id: false }
);

const deliverySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    phone: { type: String, required: true, trim: true, maxlength: 20 },
    address: { type: String, required: true, trim: true, maxlength: 300 },
    city: { type: String, required: true, trim: true, maxlength: 80 },
    postalCode: { type: String, required: true, trim: true, maxlength: 12 },
    instructions: { type: String, default: '', maxlength: 300 },
  },
  { _id: false }
);

const pricingSchema = new mongoose.Schema(
  {
    subtotal: { type: Number, required: true, min: 0 },
    deliveryFee: { type: Number, required: true, min: 0, default: 0 },
    taxRate: { type: Number, required: true, min: 0, default: 0 },
    tax: { type: Number, required: true, min: 0, default: 0 },
    total: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'INR' },
  },
  { _id: false }
);

const statusHistorySchema = new mongoose.Schema(
  {
    status: { type: String, enum: ORDER_STATUS_VALUES, required: true },
    at: { type: Date, default: Date.now },
    by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    byRole: { type: String, default: 'system' },
    note: { type: String, default: '' },
  },
  { _id: false }
);

const reservationSchema = new mongoose.Schema(
  {
    active: { type: Boolean, default: false },
    items: [
      {
        ingredient: { type: mongoose.Schema.Types.ObjectId, ref: 'Ingredient' },
        quantity: { type: Number, min: 0 },
      },
    ],
    expiresAt: { type: Date, default: null },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    orderNumber: { type: String, required: true, unique: true, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    items: { type: [orderItemSchema], validate: (v) => Array.isArray(v) && v.length > 0 },
    delivery: { type: deliverySchema, required: true },
    pricing: { type: pricingSchema, required: true },
    paymentStatus: {
      type: String,
      enum: PAYMENT_STATUS_VALUES,
      default: PAYMENT_STATUS.PENDING,
      index: true,
    },
    status: {
      type: String,
      enum: ORDER_STATUS_VALUES,
      default: ORDER_STATUS.PAYMENT_PENDING,
      index: true,
    },
    statusHistory: { type: [statusHistorySchema], default: [] },
    reservation: { type: reservationSchema, default: () => ({}) },
    inventoryDeducted: { type: Boolean, default: false },
    // Idempotency marker for payment processing — ensures stock is deducted once.
    paymentIdempotencyKey: { type: String, default: null, index: true },
    note: { type: String, default: '', maxlength: 300 },
  },
  { timestamps: true }
);

orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ 'reservation.active': 1, 'reservation.expiresAt': 1 });

export const Order = mongoose.model('Order', orderSchema);
export default Order;
