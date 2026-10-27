import api from '../lib/api.js';

export const menuService = {
  async listPizzas(params = {}) {
    const { data } = await api.get('/pizzas', { params });
    return { items: data.data, meta: data.meta };
  },
  async getPizza(id) {
    const { data } = await api.get(`/pizzas/${id}`);
    return data.data;
  },
  async listIngredients(params = {}) {
    const { data } = await api.get('/ingredients', { params });
    return data.data;
  },
  async getConfig() {
    const { data } = await api.get('/config');
    return data.data;
  },
};

export default menuService;
