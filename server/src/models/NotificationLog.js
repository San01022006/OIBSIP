import mongoose from 'mongoose';

/**
 * Tracks the alert state of each inventory item so the scheduler does not send
 * duplicate low-stock emails while an item stays below its threshold.
 */
const notificationLogSchema = new mongoose.Schema(
  {
    ingredient: { type: mongoose.Schema.Types.ObjectId, ref: 'Ingredient', required: true, unique: true, index: true },
    state: { type: String, enum: ['normal', 'low_active', 'resolved'], default: 'normal', index: true },
    thresholdAtAlert: { type: Number, default: 0 },
    quantityAtAlert: { type: Number, default: 0 },
    lastNotifiedAt: { type: Date, default: null },
    lastResolvedAt: { type: Date, default: null },
    emailsSent: { type: Number, default: 0 },
    lastDeliveryOk: { type: Boolean, default: null },
    lastError: { type: String, default: null },
  },
  { timestamps: true }
);

export const NotificationLog = mongoose.model('NotificationLog', notificationLogSchema);
export default NotificationLog;
