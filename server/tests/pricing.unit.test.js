import { describe, it, expect } from 'vitest';
import { computeUnitPrice, computeTotals } from '../src/services/orderService.js';
import { env } from '../src/config/env.js';

const config = (base = 0, sauce = 0, cheese = 0, veg = []) => ({
  base: { price: base },
  sauce: { price: sauce },
  cheese: { price: cheese },
  vegetables: veg.map((price) => ({ price })),
});

describe('computeUnitPrice', () => {
  it('adds the base price and every ingredient adjustment', () => {
    const price = computeUnitPrice(config(30, 20, 25, [10, 15]));
    expect(price).toBe(env.pricing.basePrice + 30 + 20 + 25 + 10 + 15);
  });

  it('falls back to just the base price with no adjustments', () => {
    expect(computeUnitPrice(config())).toBe(env.pricing.basePrice);
  });
});

describe('computeTotals', () => {
  it('charges delivery below the free-delivery threshold and applies tax', () => {
    const totals = computeTotals([{ lineTotal: 200 }]);
    expect(totals.subtotal).toBe(200);
    expect(totals.deliveryFee).toBe(env.pricing.deliveryFee);
    expect(totals.tax).toBe(Math.round(200 * env.pricing.taxRate));
    expect(totals.total).toBe(200 + env.pricing.deliveryFee + totals.tax);
  });

  it('waives delivery at or above the free-delivery threshold', () => {
    const threshold = env.pricing.freeDeliveryThreshold;
    const totals = computeTotals([{ lineTotal: threshold }]);
    expect(totals.deliveryFee).toBe(0);
    expect(totals.total).toBe(threshold + Math.round(threshold * env.pricing.taxRate));
  });

  it('returns zero totals for an empty item list', () => {
    const totals = computeTotals([]);
    expect(totals.subtotal).toBe(0);
    expect(totals.deliveryFee).toBe(0);
    expect(totals.total).toBe(0);
  });
});
