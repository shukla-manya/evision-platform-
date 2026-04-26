import axios from 'axios';
import Cookies from 'js-cookie';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

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
  return '/login';
}

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      const path = typeof window !== 'undefined' ? window.location.pathname : '';
      if (path === '/super/signin' || path === '/admin/login' || path === '/login') {
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
  passwordResetStart: (role: string, phone: string) =>
    api.post('/auth/password/reset/start', { role, phone }),
  passwordResetComplete: (role: string, phone: string, otp: string, new_password: string) =>
    api.post('/auth/password/reset/complete', { role, phone, otp, new_password }),
  register: (data: Record<string, unknown>) => api.post('/auth/register', data),
  adminLogin: (email: string, password: string) => api.post('/auth/admin/login', { email, password }),
  adminSetupPassword: (token: string, new_password: string) =>
    api.post('/auth/admin/setup-password', { token, new_password }),
  superadminLogin: (email: string, password: string) => api.post('/auth/superadmin/login', { email, password }),
  me: () => api.get('/auth/me'),
  replaceAddressBook: (addresses: Record<string, unknown>[]) =>
    api.put('/auth/me/address-book', { addresses }),
  updateGeo: (lat: number, lng: number) => api.patch('/auth/me/geo', { lat, lng }),
};

/** Public multipart electrician self-registration */
export async function registerElectricianFormData(formData: FormData) {
  return api.post<{ message: string; electrician_id: string }>('/electrician/register', formData);
}

// ── Admin (shop) ───────────────────────────────────────────────────────────
export const adminApi = {
  /** Multipart (shop logo) or JSON — backend accepts both for `/admin/register`. */
  register: (data: FormData | Record<string, unknown>) =>
    api.post('/admin/register', data, data instanceof FormData ? {} : undefined),
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
  updateItemQuantity: (itemId: string, quantity: number) =>
    api.patch(`/cart/${itemId}`, { quantity }),
  removeItem: (itemId: string) => api.delete(`/cart/${itemId}`),
};

export const checkoutApi = {
  createOrder: () => api.post('/checkout'),
  confirm: (body: Record<string, unknown>) => api.post('/checkout/confirm', body),
};

/** Customer/dealer service & technician discovery */
export const serviceApi = {
  createRequest: (formData: FormData) => api.post('/service/request', formData),
  bookElectrician: (electricianId: string, service_request_id: string) =>
    api.post(`/service/book/${electricianId}`, { service_request_id }),
  getBooking: (bookingId: string) => api.get(`/service/booking/${bookingId}`),
  myActiveBookings: () => api.get('/service/my/bookings/active'),
  myBookingHistory: () => api.get('/service/my/bookings/history'),
};

/** Public — no auth required */
export const technicianDirectoryApi = {
  nearby: (lat: number, lng: number) =>
    api.get('/electrician/nearby', { params: { lat, lng } }),
};

export const reviewsApi = {
  createElectricianReview: (electricianId: string, formData: FormData) =>
    api.post(`/reviews/electrician/${electricianId}`, formData),
};

export const ordersApi = {
  myOrders: () => api.get('/orders/my'),
  cancelOrderGroup: (groupId: string) => api.post(`/orders/${groupId}/cancel`),
  /** GST tax invoice PDFs only — returns application/zip blob */
  downloadGstInvoicesZip: () =>
    api.get('/orders/my/gst-invoices-zip', { responseType: 'arraybuffer' }),
};

// ── Superadmin (API path unchanged; UI lives at /super/* only) ─────────────
export const superadminApi = {
  verifyDealerGst: (userId: string) => api.put(`/superadmin/users/${userId}/verify-dealer-gst`),
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
