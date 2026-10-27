import axios from 'axios';

const API_BASE = `${import.meta.env.VITE_API_URL || ''}/api`;

export const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
  timeout: 20000,
});

function readCookie(name) {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

// Double-submit CSRF: echo the readable cc_csrf cookie on mutating requests.
api.interceptors.request.use((config) => {
  const method = (config.method || 'get').toLowerCase();
  if (['post', 'put', 'patch', 'delete'].includes(method)) {
    const csrf = readCookie('cc_csrf');
    if (csrf) config.headers['x-csrf-token'] = csrf;
  }
  return config;
});

const AUTH_SKIP = ['/auth/login', '/auth/register', '/auth/refresh', '/admin/auth/login', '/admin/auth/refresh'];

// Admin-console requests refresh against the admin-scoped endpoint; everything
// else refreshes the storefront session. Keeping these separate means a
// customer session can never shadow (or be shadowed by) an admin session.
function refreshEndpoint(url = '') {
  return url.includes('/admin') ? '/admin/auth/refresh' : '/auth/refresh';
}

const refreshPromises = {};

function requestRefresh(endpoint) {
  if (!refreshPromises[endpoint]) {
    refreshPromises[endpoint] = api
      .post(endpoint)
      .catch(() => null)
      .finally(() => {
        delete refreshPromises[endpoint];
      });
  }
  return refreshPromises[endpoint];
}

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const { response, config } = error;
    const url = config?.url || '';
    if (response?.status === 401 && !config?._retried && !AUTH_SKIP.some((p) => url.includes(p))) {
      config._retried = true;
      const refreshed = await requestRefresh(refreshEndpoint(url));
      if (refreshed) return api.request(config);
    }
    return Promise.reject(normalizeError(error));
  }
);

export function normalizeError(error) {
  const data = error?.response?.data;
  const err = new Error(data?.error?.message || error?.message || 'Something went wrong');
  err.status = error?.response?.status || 0;
  err.details = data?.error?.details || null;
  return err;
}

export const apiBase = API_BASE;
export default api;
