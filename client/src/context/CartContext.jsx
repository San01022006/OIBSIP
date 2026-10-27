import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const CartContext = createContext(null);
const STORAGE_KEY = 'cc_cart';

function keyFor(item) {
  return [
    item.pizzaId || 'custom',
    item.configuration?.base?.ingredient,
    item.configuration?.sauce?.ingredient,
    item.configuration?.cheese?.ingredient,
    (item.configuration?.vegetables || [])
      .map((v) => v.ingredient)
      .sort()
      .join('-'),
  ].join('|');
}

function read() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function CartProvider({ children }) {
  const [items, setItems] = useState(read);

  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      /* ignore quota errors */
    }
  }, [items]);

  const addItem = useCallback((item) => {
    setItems((prev) => {
      const key = keyFor(item);
      const existing = prev.find((i) => i.key === key);
      if (existing) {
        return prev.map((i) =>
          i.key === key ? { ...i, quantity: Math.min(20, i.quantity + item.quantity) } : i
        );
      }
      return [...prev, { ...item, key, quantity: Math.min(20, item.quantity) }];
    });
  }, []);

  const updateQuantity = useCallback((key, quantity) => {
    setItems((prev) =>
      quantity <= 0
        ? prev.filter((i) => i.key !== key)
        : prev.map((i) => (i.key === key ? { ...i, quantity: Math.min(20, quantity) } : i))
    );
  }, []);

  const removeItem = useCallback((key) => setItems((prev) => prev.filter((i) => i.key !== key)), []);
  const clear = useCallback(() => setItems([]), []);

  const count = useMemo(() => items.reduce((s, i) => s + i.quantity, 0), [items]);

  const value = useMemo(
    () => ({ items, count, addItem, updateQuantity, removeItem, clear }),
    [items, count, addItem, updateQuantity, removeItem, clear]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}

export default CartContext;
