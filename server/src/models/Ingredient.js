import mongoose from 'mongoose';
import { INGREDIENT_CATEGORY_VALUES, UNITS_VALUES, UNITS } from '../config/constants.js';

const ingredientSchema = new mongoose.Schema(
  {
    sku: { type: String, required: true, unique: true, trim: true, uppercase: true },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    category: {
      type: String,
      required: true,
      enum: INGREDIENT_CATEGORY_VALUES,
      index: true,
    },
    description: { type: String, default: '', trim: true, maxlength: 400 },
    image: { type: String, default: '' },
    priceAdjustment: { type: Number, required: true, min: 0, default: 0 },
    stock: { type: Number, required: true, min: 0, default: 0 },
    unit: { type: String, enum: UNITS_VALUES, default: UNITS.PIECE },
    lowStockThreshold: { type: Number, min: 0, default: 5 },
    available: { type: Boolean, default: true, index: true },
    cost: { type: Number, min: 0, default: 0 },
    lastUpdatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

ingredientSchema.index({ category: 1, name: 1 });
ingredientSchema.index({ stock: 1, lowStockThreshold: 1 });

ingredientSchema.virtual('isLowStock').get(function isLowStock() {
  return this.stock > 0 && this.stock <= this.lowStockThreshold;
});
ingredientSchema.virtual('isOutOfStock').get(function isOutOfStock() {
  return this.stock <= 0;
});

ingredientSchema.set('toJSON', { virtuals: true });
ingredientSchema.set('toObject', { virtuals: true });

export const Ingredient = mongoose.model('Ingredient', ingredientSchema);
export default Ingredient;
