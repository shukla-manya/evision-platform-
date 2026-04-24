import axios from 'axios';
import Cookies from 'js-cookie';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = Cookies.get('ev_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      Cookies.remove('ev_token');
      if (typeof window !== 'undefined') window.location.href = '/auth/login';
    }
    return Promise.reject(err);
  },
);

// ── Auth ───────────────────────────────────────────────────────────────────
export const authApi = {
  sendOtp: (phone: string) => api.post('/auth/send-otp', { phone }),
  verifyOtp: (phone: string, otp: string) => api.post('/auth/verify-otp', { phone, otp }),
  register: (data: any) => api.post('/auth/register', data),
  adminLogin: (email: string, password: string) => api.post('/auth/admin/login', { email, password }),
  superadminLogin: (email: string, password: string) => api.post('/auth/superadmin/login', { email, password }),
  me: () => api.get('/auth/me'),
};

// ── Admin ──────────────────────────────────────────────────────────────────
export const adminApi = {
  register: (data: any) => api.post('/admin/register', data),
  getMe: () => api.get('/admin/me'),
  getProducts: () => api.get('/admin/products'),
};

export const catalogApi = {
  getCategories: () => api.get('/categories'),
  getProducts: (params?: Record<string, string | number | undefined>) =>
    api.get('/products', { params }),
  getProduct: (id: string) => api.get(`/products/${id}`),
};

// ── Superadmin ─────────────────────────────────────────────────────────────
export const superadminApi = {
  getPendingAdmins: () => api.get('/superadmin/pending-admins'),
  getAllAdmins: () => api.get('/superadmin/all-admins'),
  approveAdmin: (id: string) => api.put(`/superadmin/admin/${id}/approve`),
  rejectAdmin: (id: string, reason: string) => api.put(`/superadmin/admin/${id}/reject`, { reason }),
  suspendAdmin: (id: string) => api.put(`/superadmin/admin/${id}/suspend`),
  getAnalytics: () => api.get('/superadmin/analytics'),
  getEmailLogs: (event?: string) => api.get('/superadmin/email-logs', { params: { event } }),
};
