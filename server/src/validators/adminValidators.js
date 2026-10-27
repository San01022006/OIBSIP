import { z } from 'zod';
import { ORDER_STATUS_VALUES, INGREDIENT_CATEGORY_VALUES, UNITS_VALUES } from '../config/constants.js';

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid identifier');

export const listOrdersQuery = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(12),
  status: z.enum([...ORDER_STATUS_VALUES, 'all']).optional().default('all'),
  paymentStatus: z.enum(['pending', 'paid', 'failed', 'refunded', 'all']).optional().default('all'),
  search: z.string().trim().max(120).optional().default(''),
});

export const updateStatusSchema = z.object({
  status: z.enum(ORDER_STATUS_VALUES),
  note: z.string().trim().max(300).optional().default(''),
});

export const updateInventorySchema = z.object({
  stock: z.number().int().min(0, 'Stock cannot be negative').optional(),
  lowStockThreshold: z.number().int().min(0).optional(),
  available: z.boolean().optional(),
  priceAdjustment: z.number().min(0).optional(),
  reason: z.string().trim().max(300).optional().default(''),
  adjustment: z.number().int().optional(),
});

export const listInventoryQuery = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(200).optional().default(50),
  category: z.enum([...INGREDIENT_CATEGORY_VALUES, 'all']).optional().default('all'),
  stockStatus: z.enum(['all', 'low', 'out', 'healthy']).optional().default('all'),
  search: z.string().trim().max(120).optional().default(''),
});

export const listMovementsQuery = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  ingredient: objectId.optional(),
  order: objectId.optional(),
});

export const ingredientIdParams = z.object({ id: objectId });
export const orderIdParams = z.object({ id: objectId });

export default { listOrdersQuery, updateStatusSchema, updateInventorySchema };
