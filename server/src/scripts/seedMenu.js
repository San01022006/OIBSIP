import mongoose from 'mongoose';
import { connectDatabase, disconnectDatabase } from '../config/database.js';
import { Ingredient } from '../models/Ingredient.js';
import { Pizza } from '../models/Pizza.js';
import { ingredientSeed, pizzaSeed } from '../data/menuData.js';
import { logger } from '../utils/logger.js';

/**
 * Idempotent seed. Upserts by SKU/slug so it never deletes existing data and
 * can be safely re-run. Existing stock levels are preserved on re-run.
 */
export async function seedMenu({ preserveStock = true } = {}) {
  const skuToId = new Map();

  for (const item of ingredientSeed) {
    const update = { ...item };
    const existing = await Ingredient.findOne({ sku: item.sku });
    if (existing) {
      if (preserveStock) delete update.stock;
      await Ingredient.updateOne({ sku: item.sku }, { $set: update });
      skuToId.set(item.sku, existing._id);
    } else {
      const created = await Ingredient.create(item);
      skuToId.set(item.sku, created._id);
    }
  }

  for (const pizza of pizzaSeed) {
    const recipe = pizza.recipeSku
      ? {
          base: skuToId.get(pizza.recipeSku.base) || null,
          sauce: skuToId.get(pizza.recipeSku.sauce) || null,
          cheese: skuToId.get(pizza.recipeSku.cheese) || null,
          vegetables: (pizza.recipeSku.vegetables || []).map((s) => skuToId.get(s)).filter(Boolean),
        }
      : undefined;

    const { recipeSku, ...rest } = pizza;
    await Pizza.updateOne(
      { slug: pizza.slug },
      { $set: { ...rest, ...(recipe ? { recipe } : {}) } },
      { upsert: true }
    );
  }

  return { ingredients: ingredientSeed.length, pizzas: pizzaSeed.length };
}

async function run() {
  try {
    await connectDatabase();
    const result = await seedMenu({ preserveStock: true });
    logger.info(`[seed] Upserted ${result.ingredients} ingredients and ${result.pizzas} pizzas`);
  } catch (err) {
    logger.error(`[seed] Failed: ${err.message}`);
    process.exitCode = 1;
  } finally {
    await disconnectDatabase();
    await mongoose.disconnect().catch(() => {});
  }
}

const isDirectRun = process.argv[1] && process.argv[1].endsWith('seedMenu.js');
if (isDirectRun) run();

export default seedMenu;
