import { Pizza } from '../models/Pizza.js';
import { Ingredient } from '../models/Ingredient.js';
import ApiError from '../utils/ApiError.js';
import { getPagination, buildMeta } from '../utils/pagination.js';

export async function listPizzas(req, res) {
  const { page, limit, skip } = getPagination(req.query, { defaultLimit: 24, maxLimit: 60 });
  const filter = {};
  if (req.query.category && req.query.category !== 'all') filter.category = req.query.category;
  if (req.query.available === 'true') filter.available = true;
  if (req.query.search) {
    const rx = new RegExp(req.query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ name: rx }, { description: rx }];
  }

  const [pizzas, total] = await Promise.all([
    Pizza.find(filter).sort({ featured: -1, name: 1 }).skip(skip).limit(limit).lean(),
    Pizza.countDocuments(filter),
  ]);
  res.json({ success: true, data: pizzas, meta: buildMeta({ total, page, limit }) });
}

export async function getPizza(req, res) {
  const pizza = await Pizza.findById(req.params.id).lean();
  if (!pizza) throw ApiError.notFound('Pizza not found');
  res.json({ success: true, data: pizza });
}

export async function listIngredients(req, res) {
  const filter = {};
  if (req.query.category && req.query.category !== 'all') filter.category = req.query.category;
  const ingredients = await Ingredient.find(filter).sort({ category: 1, priceAdjustment: 1 }).lean();
  res.json({ success: true, data: ingredients });
}

export default { listPizzas, getPizza, listIngredients };
