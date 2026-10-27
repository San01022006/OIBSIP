import api from '../lib/api.js';

export const paymentService = {
  async createSession(orderId) {
    const { data } = await api.post('/payments/create-order', { orderId });
    return data.data; // { provider, keyId?, razorpayOrderId?, amount, currency, mock?, mockToken? }
  },
  async verifyRazorpay(payload) {
    const { data } = await api.post('/payments/verify', payload);
    return data.data;
  },
  async verifyMock(payload) {
    const { data } = await api.post('/payments/verify-mock', payload);
    return data.data;
  },
  async reportFailed(orderId, reason) {
    const { data } = await api.post('/payments/failed', { orderId, reason });
    return data.data.order;
  },
};

/** Load the Razorpay Checkout script once. */
export function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') return resolve(false);
    if (window.Razorpay) return resolve(true);
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default paymentService;
