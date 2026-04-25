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
  if (p.startsWith('/super') || p.startsWith('/superadmin')) return '/super/signin';
  if (p.startsWith('/admin')) return '/admin/login';
  if (p.startsWith('/electrician')) return '/electrician/login';
  return '/login';
}

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      const path = typeof window !== 'undefined' ? window.location.pathname : '';
      if (path === '/super/signin' || path === '/admin/login' || path === '/electrician/login') {
        return Promise.reject(err);
      }
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
  mobileLogin: (email: string, password: string) => api.post('/auth/mobile/login', { email, password }),
  mobileLoginVerify: (login_token: string, otp: string) =>
    api.post('/auth/mobile/login/verify', { login_token, otp }),
  passwordResetStart: (role: string, phone: string) =>
    api.post('/auth/password/reset/start', { role, phone }),
  passwordResetComplete: (role: string, phone: string, otp: string, new_password: string) =>
    api.post('/auth/password/reset/complete', { role, phone, otp, new_password }),
  register: (data: Record<string, unknown>) => api.post('/auth/register', data),
  adminLogin: (email: string, password: string) => api.post('/auth/admin/login', { email, password }),
  adminLoginVerify: (login_token: string, otp: string) =>
    api.post('/auth/admin/login/verify', { login_token, otp }),
  superadminLogin: (email: string, password: string) => api.post('/auth/superadmin/login', { email, password }),
  superadminLoginVerify: (login_token: string, otp: string) =>
    api.post('/auth/superadmin/login/verify', { login_token, otp }),
  me: () => api.get('/auth/me'),
};

/** Public multipart electrician self-registration */
export async function registerElectricianFormData(formData: FormData) {
  return api.post<{ message: string; electrician_id: string }>('/electrician/register', formData);
}

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

// ── Superadmin (API path unchanged; UI lives at /super/* only) ─────────────
export const superadminApi = {
  getPendingAdmins: () => api.get('/superadmin/pending-admins'),
  getAllAdmins: () => api.get('/superadmin/all-admins'),
  approveAdmin: (id: string) => api.put(`/superadmin/admin/${id}/approve`),
  rejectAdmin: (id: string, reason: string) => api.put(`/superadmin/admin/${id}/reject`, { reason }),
  suspendAdmin: (id: string) => api.put(`/superadmin/admin/${id}/suspend`),
  setPlatformCommission: (id: string, platform_commission_pct: number) =>
    api.put(`/superadmin/admin/${id}/commission`, { platform_commission_pct }),
  markShopSettled: (id: string) => api.put(`/superadmin/admin/${id}/mark-settled`),
  getPendingElectricians: () => api.get('/superadmin/pending-electricians'),
  reviewElectrician: (id: string, body: { action: 'approve' | 'reject'; reason?: string }) =>
    api.put(`/superadmin/electrician/${id}/approve`, body),
  getAnalytics: () => api.get('/superadmin/analytics'),
  getSettlements: () => api.get('/superadmin/settlements'),
  getReviews: () => api.get('/superadmin/reviews'),
  deleteReview: (id: string) => api.delete(`/superadmin/reviews/${id}`),
  getEmailLogs: (params?: {
    event?: string;
    status?: string;
    to_role?: string;
    date_from?: string;
    date_to?: string;
  }) => api.get('/superadmin/email-logs', { params }),
};

export const electricianApi = {
  me: () => api.get('/electrician/me'),
  myBookings: () => api.get('/electrician/my/bookings'),
  pendingBookings: () => api.get('/electrician/bookings/pending'),
  activeBookings: () => api.get('/electrician/bookings/active'),
  historyBookings: () => api.get('/electrician/bookings/history'),
  getBookingProfile: (id: string) => api.get(`/electrician/${id}/profile`),
  respondBooking: (bookingId: string, action: 'accept' | 'decline') =>
    api.put(`/electrician/booking/${bookingId}/respond`, { action }),
  updateJobStatus: (
    bookingId: string,
    status: 'on_the_way' | 'reached' | 'work_started' | 'completed',
  ) => api.put(`/electrician/job/${bookingId}/status`, { status }),
  setAvailability: (online: boolean) => api.put('/electrician/me/availability', { online }),
  uploadWorkPhoto: (bookingId: string, file: File) => {
    const fd = new FormData();
    fd.append('photo', file);
    return api.post(`/electrician/job/${bookingId}/photo`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};
