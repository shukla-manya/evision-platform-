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

function loginPathFor401(): string {
  if (typeof window === 'undefined') return '/login';
  const p = window.location.pathname;
  if (p.startsWith('/superadmin')) return '/superadmin/login';
  if (p.startsWith('/admin')) return '/admin/login';
  return '/login';
}

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      Cookies.remove('ev_token');
      Cookies.remove('ev_role');
      if (typeof window !== 'undefined') {
        window.location.href = loginPathFor401();
      }
    }
    return Promise.reject(err);
  },
);

// ── Auth ───────────────────────────────────────────────────────────────────
export const authApi = {
  sendOtp: (phone: string) => api.post('/auth/send-otp', { phone }),
  verifyOtp: (phone: string, otp: string) => api.post('/auth/verify-otp', { phone, otp }),
  register: (data: Record<string, unknown>) => api.post('/auth/register', data),
  adminLogin: (email: string, password: string) => api.post('/auth/admin/login', { email, password }),
  superadminLogin: (email: string, password: string) => api.post('/auth/superadmin/login', { email, password }),
  me: () => api.get('/auth/me'),
};

// ── Admin (shop) ───────────────────────────────────────────────────────────
export const adminApi = {
  register: (data: Record<string, unknown>) => api.post('/admin/register', data),
  getMe: () => api.get('/admin/me'),
  uploadLogo: (file: File) => {
    const fd = new FormData();
    fd.append('logo', file);
    return api.post('/admin/upload-logo', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  getProducts: () => api.get('/admin/products'),
  getProduct: (id: string) => api.get(`/admin/products/${id}`),
  createProduct: (body: Record<string, unknown>) => api.post('/admin/products', body),
  updateProduct: (id: string, body: Record<string, unknown>) => api.put(`/admin/products/${id}`, body),
  deleteProduct: (id: string) => api.delete(`/admin/products/${id}`),
  uploadProductImages: (files: File[]) => {
    const fd = new FormData();
    files.forEach((f) => fd.append('images', f));
    return api.post('/admin/products/images/upload', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  getOrders: () => api.get('/admin/orders'),
  getOrder: (id: string) => api.get(`/admin/orders/${id}`),
  shipOrder: (id: string, body?: Record<string, unknown>) => api.post(`/admin/orders/${id}/ship`, body || {}),
  getInvoices: () => api.get('/admin/invoices'),
};

export const catalogApi = {
  getCategories: () => api.get('/categories'),
  getProducts: (params?: Record<string, string | number | undefined>) =>
    api.get('/products', { params }),
  getProduct: (id: string) => api.get(`/products/${id}`),
};

// ── Cart / Checkout ────────────────────────────────────────────────────────
export const cartApi = {
  getCart: () => api.get('/cart'),
  addItem: (product_id: string, quantity = 1) => api.post('/cart/add', { product_id, quantity }),
  removeItem: (itemId: string) => api.delete(`/cart/${itemId}`),
};

export const checkoutApi = {
  createOrder: () => api.post('/checkout'),
};

export const ordersApi = {
  myOrders: () => api.get('/orders/my'),
  cancelOrderGroup: (groupId: string) => api.post(`/orders/${groupId}/cancel`),
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
