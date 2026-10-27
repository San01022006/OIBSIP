import { describe, it, expect } from 'vitest';
import { requiredQuantities } from '../src/services/inventoryService.js';

const id = (n) => n; // id values only need to be comparable as strings

const item = (quantity, base, sauce, cheese, veg = []) => ({
  quantity,
  configuration: {
    base: { ingredient: base },
    sauce: { ingredient: sauce },
    cheese: { ingredient: cheese },
    vegetables: veg.map((v) => ({ ingredient: v })),
  },
});

describe('requiredQuantities', () => {
  it('counts one unit of each configured ingredient per pizza', () => {
    const req = requiredQuantities([item(1, 'b1', 's1', 'c1', ['v1', 'v2'])]);
    expect(req.get('b1')).toBe(1);
    expect(req.get('s1')).toBe(1);
    expect(req.get('c1')).toBe(1);
    expect(req.get('v1')).toBe(1);
    expect(req.get('v2')).toBe(1);
  });

  it('multiplies by quantity and aggregates across items', () => {
    const req = requiredQuantities([
      item(2, 'b1', 's1', 'c1', ['v1']),
      item(3, 'b1', 's2', 'c1', ['v1']),
    ]);
    expect(req.get('b1')).toBe(5);
    expect(req.get('c1')).toBe(5);
    expect(req.get('v1')).toBe(5);
    expect(req.get('s1')).toBe(2);
    expect(req.get('s2')).toBe(3);
  });

  it('ignores pizzas with no vegetables', () => {
    const req = requiredQuantities([item(1, 'b1', 's1', 'c1')]);
    expect([...req.keys()]).toEqual(['b1', 's1', 'c1']);
  });
});
