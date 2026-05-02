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
  // Default instance header is application/json. For FormData, axios would otherwise
  // JSON-serialize the payload (see axios transformRequest) and uploads would be empty.
  if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
    if (typeof config.headers.delete === 'function') {
      config.headers.delete('Content-Type');
    } else {
      delete (config.headers as Record<string, unknown>)['Content-Type'];
      delete (config.headers as Record<string, unknown>)['content-type'];
    }
  }
  return config;
});

function loginPathFor401(): string {
  if (typeof window === 'undefined') return '/login';
  const p = window.location.pathname;
  if (p.startsWith('/super') || p.startsWith('/superadmin')) return '/super/signin';
  return '/login';
}

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      const path = typeof window !== 'undefined' ? window.location.pathname : '';
      if (
        path === '/super/signin' ||
        path === '/login' ||
        path === '/register'
      ) {
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
  sendOtp: (email: string, extra?: { purpose?: 'signup' }) =>
    api.post('/auth/send-otp', { email: email.trim().toLowerCase(), ...extra }),
  verifyOtp: (email: string, otp: string) =>
    api.post('/auth/verify-otp', { email: email.trim().toLowerCase(), otp }),
  passwordResetStart: (role: string, email: string) =>
    api.post('/auth/password/reset/start', { role, email: email.trim().toLowerCase() }),
  passwordResetComplete: (role: string, email: string, otp: string, new_password: string) =>
    api.post('/auth/password/reset/complete', {
      role,
      email: email.trim().toLowerCase(),
      otp,
      new_password,
    }),
  register: (data: Record<string, unknown>) => api.post('/auth/register', data),
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

export const catalogApi = {
  getCategories: () => api.get('/categories'),
  getProducts: (params?: Record<string, string | number | boolean | undefined>) =>
    api.get('/products', { params }),
  /** Curated homepage grids (superadmin `home_showcase_*` on platform catalogue). */
  getHomeShowcase: () =>
    api.get<{ primary: Record<string, unknown>[]; combos: Record<string, unknown>[] }>('/products/home-showcase'),
  getProduct: (id: string) => api.get(`/products/${id}`),
  getProductReviews: (id: string) => api.get<Record<string, unknown>[]>(`/products/${id}/reviews`),
  getApprovedShops: () => api.get<Array<{ id: string; shop_name: string }>>('/products/shops/approved'),
};

export type ContactMessageResponse = {
  ok: true;
  greeting_name: string;
  first_name: string;
  last_name: string;
  email: string;
  message: string;
};

/** Public — no auth; sends mail via backend SMTP */
export const publicContactApi = {
  submitMessage: (body: { first_name: string; last_name: string; email: string; message: string }) =>
    api.post<ContactMessageResponse>('/contact/message', body),
  subscribeNewsletter: (body: { email: string }) =>
    api.post<{ ok: boolean; email: string }>('/contact/newsletter', body),
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
  createOrder: (body?: { delivery_address_index?: number }) => api.post('/checkout', body ?? {}),
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
  createProductReview: (productId: string, formData: FormData) =>
    api.post(`/reviews/product/${productId}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
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
  getPendingDealerGst: () => api.get('/superadmin/pending-dealer-gst'),
  getPendingElectricians: () => api.get('/superadmin/pending-electricians'),
  reviewElectrician: (id: string, body: { action: 'approve' | 'reject'; reason?: string }) =>
    api.put(`/superadmin/electrician/${id}/approve`, body),
  getAnalytics: () => api.get('/superadmin/analytics'),
  getReviews: () => api.get('/superadmin/reviews'),
  deleteReview: (id: string) => api.delete(`/superadmin/reviews/${id}`),
  getEmailLogs: (params?: {
    event?: string;
    status?: string;
    to_role?: string;
    date_from?: string;
    date_to?: string;
  }) => api.get('/superadmin/email-logs', { params }),

  /** Platform catalogue (requires `PLATFORM_CATALOG_ADMIN_ID` on the API). */
  getCatalogProducts: () => api.get('/superadmin/products'),
  getCatalogProduct: (id: string) => api.get(`/superadmin/products/${id}`),
  createCatalogProduct: (body: FormData | Record<string, unknown>) =>
    api.post('/superadmin/products', body, body instanceof FormData ? {} : undefined),
  updateCatalogProduct: (id: string, body: FormData | Record<string, unknown>) =>
    api.put(`/superadmin/products/${id}`, body, body instanceof FormData ? {} : undefined),
  deleteCatalogProduct: (id: string) => api.delete(`/superadmin/products/${id}`),
  uploadCatalogProductImages: (files: File[]) => {
    const fd = new FormData();
    files.forEach((f) => fd.append('images', f));
    return api.post('/superadmin/products/images/upload', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  getCatalogOrders: () => api.get('/superadmin/orders'),
  getCatalogOrder: (id: string) => api.get(`/superadmin/orders/${id}`),
  shipCatalogOrder: (id: string, body?: Record<string, unknown>) =>
    api.post(`/superadmin/orders/${id}/ship`, body || {}),
  getCatalogInvoices: () => api.get('/superadmin/invoices'),
  createCategory: (body: Record<string, unknown>) => api.post('/superadmin/categories', body),
  updateCategory: (id: string, body: Record<string, unknown>) => api.put(`/superadmin/categories/${id}`, body),
  deleteCategory: (id: string) => api.delete(`/superadmin/categories/${id}`),
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
  updateGeo: (lat: number, lng: number) => api.patch('/electrician/me/geo', { lat, lng }),
  uploadWorkPhoto: (bookingId: string, file: File) => {
    const fd = new FormData();
    fd.append('photo', file);
    return api.post(`/electrician/job/${bookingId}/photo`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};
