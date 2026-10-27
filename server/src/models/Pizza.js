import mongoose from 'mongoose';
import { PIZZA_CATEGORIES } from '../config/constants.js';

const pizzaSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    description: { type: String, required: true, trim: true, maxlength: 500 },
    image: { type: String, default: '' },
    category: { type: String, enum: PIZZA_CATEGORIES, default: 'classic', index: true },
    price: { type: Number, required: true, min: 0 },
    ingredients: { type: [String], default: [] },
    
    recipe: {
      base: { type: mongoose.Schema.Types.ObjectId, ref: 'Ingredient', default: null },
      sauce: { type: mongoose.Schema.Types.ObjectId, ref: 'Ingredient', default: null },
      cheese: { type: mongoose.Schema.Types.ObjectId, ref: 'Ingredient', default: null },
      vegetables: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Ingredient' }],
    },
    isVeg: { type: Boolean, default: true },
    spicyLevel: { type: Number, min: 0, max: 3, default: 0 },
    available: { type: Boolean, default: true, index: true },
    featured: { type: Boolean, default: false, index: true },
    rating: { type: Number, min: 0, max: 5, default: 4.5 },
    prepMinutes: { type: Number, min: 0, default: 20 },
  },
  { timestamps: true }
);

pizzaSchema.index({ name: 'text', description: 'text' });

export const Pizza = mongoose.model('Pizza', pizzaSchema);
export default Pizza;
