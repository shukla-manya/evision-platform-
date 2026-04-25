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

export const authApi = {
  sendOtp: (phone: string) => api.post('/auth/send-otp', { phone }),
  verifyOtp: (phone: string, otp: string) =>
    api.post<OtpVerifyResponse>('/auth/verify-otp', { phone, otp }),
  me: () => api.get('/auth/me'),
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
};

export const ordersApi = {
  listMyGroups: () => api.get<any[]>('/orders/my'),
  cancelGroup: (groupId: string) => api.post(`/orders/${groupId}/cancel`),
};
