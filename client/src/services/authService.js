import api from '../lib/api.js';

export const authService = {
  async register(payload) {
    const { data } = await api.post('/auth/register', payload);
    return data.data;
  },
  async verifyEmail(token) {
    const { data } = await api.post('/auth/verify-email', { token });
    return data.data;
  },
  async resendVerification(email) {
    const { data } = await api.post('/auth/resend-verification', { email });
    return data.data;
  },
  async login(payload) {
    const { data } = await api.post('/auth/login', payload);
    return data.data;
  },
  async logout() {
    const { data } = await api.post('/auth/logout');
    return data.data;
  },
  async me() {
    const { data } = await api.get('/auth/me');
    return data.data.user;
  },
  async forgotPassword(email) {
    const { data } = await api.post('/auth/forgot-password', { email });
    return data.data;
  },
  async resetPassword(payload) {
    const { data } = await api.post('/auth/reset-password', payload);
    return data.data;
  },
  async refresh() {
    const { data } = await api.post('/auth/refresh');
    return data.data;
  },
};

export default authService;
