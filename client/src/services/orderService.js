import api from '../lib/api.js';

/** Convert a client cart item into the minimal payload the backend expects. */
export function toOrderItem(item) {
  return {
    pizza: item.pizzaId || null,
    quantity: item.quantity,
    configuration: {
      base: { ingredient: item.configuration.base.ingredient },
      sauce: { ingredient: item.configuration.sauce.ingredient },
      cheese: { ingredient: item.configuration.cheese.ingredient },
      vegetables: (item.configuration.vegetables || []).map((v) => ({ ingredient: v.ingredient })),
    },
  };
}

export const orderService = {
  async preview(items) {
    const { data } = await api.post('/orders/preview', { items: items.map(toOrderItem) });
    return data.data; // { items, pricing, availability }
  },
  async create({ items, delivery, note }) {
    const { data } = await api.post('/orders', {
      items: items.map(toOrderItem),
      delivery,
      note,
    });
    return data.data.order;
  },
  async myOrders(params = {}) {
    const { data } = await api.get('/orders/my', { params });
    return { items: data.data, meta: data.meta };
  },
  async getOrder(id) {
    const { data } = await api.get(`/orders/${id}`);
    return data.data; // { order, payment }
  },
  async cancel(id, reason) {
    const { data } = await api.post(`/orders/${id}/cancel`, { reason });
    return data.data.order;
  },
};

export default orderService;
