import mongoose from 'mongoose';
import { MOVEMENT_TYPE } from '../config/constants.js';

const inventoryMovementSchema = new mongoose.Schema(
  {
    ingredient: { type: mongoose.Schema.Types.ObjectId, ref: 'Ingredient', required: true, index: true },
    ingredientName: { type: String, default: '' },
    category: { type: String, default: '' },
    type: { type: String, enum: Object.values(MOVEMENT_TYPE), required: true, index: true },
    change: { type: Number, required: true },
    balanceAfter: { type: Number, min: 0, default: 0 },
    reason: { type: String, default: '', maxlength: 300 },
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', default: null, index: true },
    actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    actorName: { type: String, default: 'system' },
  },
  { timestamps: true }
);

inventoryMovementSchema.index({ createdAt: -1 });
inventoryMovementSchema.index({ ingredient: 1, createdAt: -1 });

export const InventoryMovement = mongoose.model('InventoryMovement', inventoryMovementSchema);
export default InventoryMovement;
