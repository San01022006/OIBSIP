import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import menuService from '../services/menuService.js';

const ConfigContext = createContext(null);

const FALLBACK = {
  brand: { name: 'Crust & Craft', currency: 'INR' },
  pricing: { basePrice: 99, deliveryFee: 40, freeDeliveryThreshold: 499, taxRate: 0.05 },
  payments: { razorpayConfigured: false, razorpayKeyId: null, mockEnabled: false },
};

export function ConfigProvider({ children }) {
  const [config, setConfig] = useState(FALLBACK);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    menuService
      .getConfig()
      .then((c) => active && c && setConfig(c))
      .catch(() => {})
      .finally(() => active && setLoaded(true));
    return () => {
      active = false;
    };
  }, []);

  const value = useMemo(() => ({ ...config, loaded }), [config, loaded]);
  return <ConfigContext.Provider value={value}>{children}</ConfigContext.Provider>;
}

export function useConfig() {
  const ctx = useContext(ConfigContext);
  if (!ctx) throw new Error('useConfig must be used within ConfigProvider');
  return ctx;
}

/** Live display estimate — the backend remains authoritative. */
export function estimatePizzaPrice(configuration, basePrice) {
  if (!configuration) return basePrice || 0;
  const veg = (configuration.vegetables || []).reduce((s, v) => s + (v.price || 0), 0);
  return (
    (basePrice || 0) +
    (configuration.base?.price || 0) +
    (configuration.sauce?.price || 0) +
    (configuration.cheese?.price || 0) +
    veg
  );
}

export default ConfigContext;
