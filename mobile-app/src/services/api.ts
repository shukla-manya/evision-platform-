import axios from 'axios';

const RAW_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';

export const API_BASE_URL = RAW_BASE_URL;

let authTokenGetter: (() => string | null) | null = null;

export function setApiTokenGetter(getter: () => string | null) {
  authTokenGetter = getter;
}

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = authTokenGetter?.();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
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

export type OtpVerifyResponse = {
  access_token: string;
  is_registered: boolean;
};

export type PasswordResetRole = 'electrician' | 'admin';

export type RegisterRequest = {
  name: string;
  phone: string;
  email: string;
  role: 'customer' | 'dealer';
  otp: string;
  gst_no?: string;
  address?: string;
  business_name?: string;
  business_address?: string;
  business_city?: string;
  business_pincode?: string;
  lat?: number;
  lng?: number;
};

export type Product = {
  id: string;
  name: string;
  description?: string;
  image_url?: string;
  images?: string[];
  price_customer?: number;
  price_dealer?: number;
  shop_name?: string | null;
  category_id?: string;
};

export type ApprovedShopRow = { id: string; shop_name: string };

export type CartResponse = {
  shops: Array<{
    admin_id: string;
    shop_name: string;
    shop_total: number;
    items: Array<{
      id: string;
      product_id: string;
      product_name: string;
      quantity: number;
      price_at_time: number;
      line_total: number;
      product_image_url?: string | null;
    }>;
  }>;
  total_items: number;
  grand_total: number;
  currency?: string;
};

export type CheckoutResponse = {
  razorpay_order_id: string;
  amount: number;
  amount_paise: number;
  currency: string;
  key_id: string;
};

export type CheckoutConfirmRequest = {
  status: 'success' | 'failure';
  razorpay_order_id: string;
  razorpay_payment_id?: string;
  razorpay_signature?: string;
  failure_reason?: string;
};

export type ServiceBooking = {
  id: string;
  request_id: string;
  customer_id: string;
  electrician_id: string;
  status: string;
  job_status?: 'accepted' | 'on_the_way' | 'reached' | 'work_started' | 'completed' | null;
  work_photo_url?: string;
  updated_at?: string;
  created_at?: string;
  expires_at?: string;
};

export type ServiceRequestSummary = {
  id: string;
  issue?: string;
  lat?: number;
  lng?: number;
};

export type ServiceBookingHistoryRow = ServiceBooking & {
  request_summary?: ServiceRequestSummary | null;
  electrician_name?: string | null;
};

export type NearbyElectrician = ElectricianProfile & {
  distance_km?: number;
};

export type ElectricianPublicProfile = Record<string, unknown> & {
  id?: string;
  name?: string;
  reviews?: Array<Record<string, unknown>>;
};

export type CustomerBookingDetail = {
  booking: ServiceBooking;
  request: Record<string, unknown> | null;
  electrician: Record<string, unknown> | null;
};

export type ElectricianProfile = {
  id: string;
  name: string;
  email: string;
  phone: string;
  address?: string;
  lat: number;
  lng: number;
  available: boolean;
  rating_avg: number;
  rating_count: number;
  total_reviews?: number;
  skills: string[];
  photo_url?: string;
  status: 'pending' | 'approved' | 'rejected';
  reject_reason?: string | null;
  fcm_token?: string;
};

export const authApi = {
  adminLogin: (email: string, password: string) =>
    api.post<{ access_token: string; admin: unknown }>('/auth/admin/login', { email, password }),
  sendOtp: (phone: string, extra?: { purpose?: 'signup'; email?: string }) =>
    api.post('/auth/send-otp', { phone, ...extra }),
  verifyOtp: (phone: string, otp: string) =>
    api.post<OtpVerifyResponse>('/auth/verify-otp', { phone, otp }),
  register: (payload: RegisterRequest) => api.post('/auth/register', payload),
  passwordResetStart: (role: PasswordResetRole, phone: string) =>
    api.post('/auth/password/reset/start', { role, phone }),
  passwordResetComplete: (role: PasswordResetRole, phone: string, otp: string, newPassword: string) =>
    api.post('/auth/password/reset/complete', { role, phone, otp, new_password: newPassword }),
  me: () => api.get('/auth/me'),
  saveDeviceToken: (fcmToken: string) => api.post('/auth/me/device-token', { fcm_token: fcmToken }),
  updateGeo: (lat: number, lng: number) => api.patch<{ lat: number; lng: number; geo_captured_at: string }>('/auth/me/geo', { lat, lng }),
};

export const productApi = {
  list: (params?: { approved_shops_only?: boolean; category_id?: string; search?: string }) =>
    api.get<Product[]>('/products', { params }),
  getById: (id: string) => api.get<Product>(`/products/${id}`),
  listApprovedShops: () => api.get<ApprovedShopRow[]>('/products/shops/approved'),
};

export const cartApi = {
  get: () => api.get<CartResponse>('/cart'),
  add: (productId: string, quantity = 1) =>
    api.post('/cart/add', { product_id: productId, quantity }),
  remove: (itemId: string) => api.delete(`/cart/${itemId}`),
};

export const checkoutApi = {
  create: () => api.post<CheckoutResponse>('/checkout'),
  confirm: (payload: CheckoutConfirmRequest) => api.post('/checkout/confirm', payload),
};

export const ordersApi = {
  listMyGroups: () => api.get<any[]>('/orders/my'),
  cancelGroup: (groupId: string) => api.post(`/orders/${groupId}/cancel`),
};

export const serviceApi = {
  listMyActiveBookings: () => api.get<ServiceBooking[]>('/service/my/bookings/active'),
  listMyBookingHistory: () => api.get<ServiceBookingHistoryRow[]>('/service/my/bookings/history'),
  getBookingDetail: (bookingId: string) =>
    api.get<CustomerBookingDetail>(`/service/booking/${bookingId}`),
  createRequest: (formData: FormData) =>
    api.post<Record<string, unknown>>('/service/request', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  bookElectrician: (electricianId: string, serviceRequestId: string) =>
    api.post<ServiceBooking>(`/service/book/${electricianId}`, { service_request_id: serviceRequestId }),
};

/** Public electrician browse (no auth). */
export const publicElectricianApi = {
  nearby: (lat: number, lng: number) =>
    api.get<NearbyElectrician[]>('/electrician/nearby', { params: { lat, lng } }),
  profile: (electricianId: string) =>
    api.get<ElectricianPublicProfile>(`/electrician/${electricianId}/profile`),
};

export const reviewsApi = {
  submitElectricianReview: (electricianId: string, formData: FormData) =>
    api.post(`/reviews/electrician/${electricianId}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
};

export const electricianApi = {
  me: () => api.get<ElectricianProfile>('/electrician/me'),
  myBookings: () => api.get<ServiceBooking[]>('/electrician/my/bookings'),
  myActiveBooking: () => api.get<ServiceBooking | null>('/electrician/my/active-booking'),
  pendingBookings: () => api.get<ServiceBooking[]>('/electrician/bookings/pending'),
  activeBookings: () => api.get<ServiceBooking[]>('/electrician/bookings/active'),
  historyBookings: () => api.get<ServiceBooking[]>('/electrician/bookings/history'),
  respondBooking: (bookingId: string, action: 'accept' | 'decline') =>
    api.put(`/electrician/booking/${bookingId}/respond`, { action }),
  updateJobStatus: (
    bookingId: string,
    status: 'on_the_way' | 'reached' | 'work_started' | 'completed',
  ) => api.put(`/electrician/job/${bookingId}/status`, { status }),
  setAvailability: (online: boolean) => api.put('/electrician/me/availability', { online }),
  updateGeo: (lat: number, lng: number) =>
    api.patch<{ lat: number; lng: number; geo_captured_at: string }>('/electrician/me/geo', { lat, lng }),
  saveDeviceToken: (fcmToken: string) => api.post('/electrician/my/device-token', { fcm_token: fcmToken }),
  uploadWorkPhoto: (bookingId: string, formData: FormData) =>
    api.post(`/electrician/job/${bookingId}/photo`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
};

export const electricianRegisterApi = {
  register: (formData: FormData) =>
    api.post('/electrician/register', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
};

export const adminApi = {
  /** Public: self-service shop registration (multipart, optional logo). */
  registerShop: (formData: FormData) =>
    api.post('/admin/register', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  me: () => api.get('/admin/me'),
  uploadLogo: (file: { uri: string; name: string; type: string }) => {
    const fd = new FormData();
    fd.append('logo', file as never);
    return api.post('/admin/upload-logo', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  getProducts: () => api.get<any[]>('/admin/products'),
  getProduct: (id: string) => api.get<any>(`/admin/products/${id}`),
  createProduct: (payload: Record<string, unknown>) => api.post('/admin/products', payload),
  updateProduct: (id: string, payload: Record<string, unknown>) =>
    api.put(`/admin/products/${id}`, payload),
  deleteProduct: (id: string) => api.delete(`/admin/products/${id}`),
  uploadProductImages: (files: { uri: string; name: string; type: string }[]) => {
    const fd = new FormData();
    files.forEach((f) => fd.append('images', f as never));
    return api.post('/admin/products/images/upload', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  getOrders: () => api.get<any[]>('/admin/orders'),
  getOrder: (id: string) => api.get<any>(`/admin/orders/${id}`),
  shipOrder: (id: string, payload?: Record<string, unknown>) =>
    api.post(`/admin/orders/${id}/ship`, payload || {}),
  getInvoices: () => api.get<any[]>('/admin/invoices'),
};

export const catalogApi = {
  getCategories: () => api.get<any[]>('/categories'),
};
