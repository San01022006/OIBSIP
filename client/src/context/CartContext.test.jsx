import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { CartProvider, useCart } from './CartContext.jsx';

const wrapper = ({ children }) => <CartProvider>{children}</CartProvider>;

beforeEach(() => {
  sessionStorage.clear();
});

const customPizza = (vegId = 'v1') => ({
  pizzaId: null,
  name: 'Custom Pizza',
  quantity: 1,
  configuration: {
    base: { ingredient: 'b1', name: 'Base', price: 0 },
    sauce: { ingredient: 's1', name: 'Sauce', price: 0 },
    cheese: { ingredient: 'c1', name: 'Cheese', price: 0 },
    vegetables: [{ ingredient: vegId, name: 'Onion', price: 10 }],
  },
});

describe('CartContext', () => {
  it('starts empty', () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    expect(result.current.items).toHaveLength(0);
    expect(result.current.count).toBe(0);
  });

  it('adds an item and tracks the count', () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    act(() => result.current.addItem(customPizza()));
    expect(result.current.items).toHaveLength(1);
    expect(result.current.count).toBe(1);
  });

  it('merges identical configurations by increasing quantity', () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    act(() => result.current.addItem(customPizza()));
    act(() => result.current.addItem(customPizza()));
    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].quantity).toBe(2);
    expect(result.current.count).toBe(2);
  });

  it('removes an item when quantity drops to zero', () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    act(() => result.current.addItem(customPizza()));
    const key = result.current.items[0].key;
    act(() => result.current.updateQuantity(key, 0));
    expect(result.current.items).toHaveLength(0);
  });
});
