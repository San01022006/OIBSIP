import api from '../lib/api.js';

export const adminService = {
  async login(payload) {
    const { data } = await api.post('/admin/auth/login', payload);
    return data.data;
  },
  async me() {
    const { data } = await api.get('/admin/auth/me');
    return data.data.user;
  },
  async logout() {
    await api.post('/admin/auth/logout');
  },
  async dashboard() {
    const { data } = await api.get('/admin/dashboard');
    return data.data;
  },
  async orders(params = {}) {
    const { data } = await api.get('/admin/orders', { params });
    return { items: data.data, meta: data.meta };
  },
  async order(id) {
    const { data } = await api.get(`/admin/orders/${id}`);
    return data.data; // { order, payment, movements }
  },
  async updateOrderStatus(id, status, note = '') {
    const { data } = await api.patch(`/admin/orders/${id}/status`, { status, note });
    return data.data.order;
  },
  async inventory(params = {}) {
    const { data } = await api.get('/admin/inventory', { params });
    return { items: data.data, meta: data.meta };
  },
  async updateInventory(id, payload) {
    const { data } = await api.patch(`/admin/inventory/${id}`, payload);
    return data.data;
  },
  async movements(params = {}) {
    const { data } = await api.get('/admin/inventory/movements', { params });
    return { items: data.data, meta: data.meta };
  },
  async checkAlerts() {
    const { data } = await api.post('/admin/inventory/check-alerts');
    return data.data;
  },
};

export default adminService;
