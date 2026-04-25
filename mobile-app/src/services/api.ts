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
  return config;
});

export type OtpVerifyResponse = {
  access_token: string;
  is_registered: boolean;
};

export type MobileLoginResponse = {
  otp_sent: boolean;
  login_token: string;
  role: 'customer' | 'dealer' | 'electrician';
  phone: string;
};

export type MobileLoginVerifyResponse = {
  access_token: string;
  role: 'customer' | 'dealer' | 'electrician';
  profile: Record<string, unknown>;
};

export type RegisterRequest = {
  name: string;
  phone: string;
  email: string;
  password?: string;
  role: 'customer' | 'dealer' | 'electrician';
  otp: string;
  gst_no?: string;
  address?: string;
};

export type Product = {
  id: string;
  name: string;
  description?: string;
  image_url?: string;
  images?: string[];
  price_customer?: number;
  price_dealer?: number;
};

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
  fcm_token?: string;
};

export const authApi = {
  mobileLogin: (email: string, password: string) =>
    api.post<MobileLoginResponse>('/auth/mobile/login', { email, password }),
  mobileLoginVerify: (loginToken: string, otp: string) =>
    api.post<MobileLoginVerifyResponse>('/auth/mobile/login/verify', { login_token: loginToken, otp }),
  sendOtp: (phone: string) => api.post('/auth/send-otp', { phone }),
  verifyOtp: (phone: string, otp: string) =>
    api.post<OtpVerifyResponse>('/auth/verify-otp', { phone, otp }),
  register: (payload: RegisterRequest) => api.post('/auth/register', payload),
  me: () => api.get('/auth/me'),
  saveDeviceToken: (fcmToken: string) => api.post('/auth/me/device-token', { fcm_token: fcmToken }),
};

export const productApi = {
  list: () => api.get<Product[]>('/products'),
  getById: (id: string) => api.get<Product>(`/products/${id}`),
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
};

export const electricianApi = {
  me: () => api.get<ElectricianProfile>('/electrician/me'),
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
