import { z } from 'zod';

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid identifier');

const selectedIngredient = z.object({
  ingredient: objectId,
  name: z.string().trim().min(1).max(120).optional(),
  price: z.number().min(0).optional(),
});

export const configurationSchema = z.object({
  base: selectedIngredient,
  sauce: selectedIngredient,
  cheese: selectedIngredient,
  vegetables: z.array(selectedIngredient).max(10).default([]),
});

const orderItem = z.object({
  pizza: objectId.nullable().optional(),
  quantity: z.number().int().min(1).max(20).default(1),
  configuration: configurationSchema,
});

export const deliverySchema = z.object({
  name: z.string().trim().min(2, 'Enter the recipient name').max(120),
  phone: z
    .string()
    .trim()
    .regex(/^[0-9+\-\s()]{7,20}$/, 'Enter a valid phone number'),
  address: z.string().trim().min(5, 'Enter a delivery address').max(300),
  city: z.string().trim().min(2, 'Enter a city').max(80),
  postalCode: z.string().trim().regex(/^[0-9A-Za-z\-\s]{4,12}$/, 'Enter a valid postal code'),
  instructions: z.string().trim().max(300).optional().default(''),
});

export const previewOrderSchema = z.object({
  items: z.array(orderItem).min(1, 'Add at least one pizza').max(20),
});

export const createOrderSchema = z.object({
  items: z.array(orderItem).min(1, 'Add at least one pizza').max(20),
  delivery: deliverySchema,
  note: z.string().trim().max(300).optional().default(''),
});

export const cancelOrderSchema = z.object({
  reason: z.string().trim().max(300).optional().default(''),
});

export default { previewOrderSchema, createOrderSchema, deliverySchema };
