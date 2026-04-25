import axios from 'axios';

export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000';

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
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export type Electrician = {
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

export type Booking = {
  id: string;
  request_id: string;
  customer_id: string;
  electrician_id: string;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  job_status: 'accepted' | 'on_the_way' | 'reached' | 'work_started' | 'completed' | null;
  job_photo_url?: string;
  expires_at: string;
  created_at: string;
  updated_at: string;
  work_photo_url?: string;
};

export const electricianAuthApi = {
  login: (email: string, password: string) =>
    api.post<{ access_token: string; electrician: Electrician }>('/auth/electrician/login', {
      email,
      password,
    }),
  me: () => api.get<Electrician>('/electrician/me'),
  saveDeviceToken: (fcmToken: string) =>
    api.post('/electrician/my/device-token', { fcm_token: fcmToken }),
};

export const electricianRegisterApi = {
  register: (formData: FormData) =>
    api.post('/electrician/register', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
};

export const bookingsApi = {
  myBookings: () => api.get<Booking[]>('/electrician/my/bookings'),
  myActiveBooking: () => api.get<Booking | null>('/electrician/my/active-booking'),
  pending: () => api.get<Booking[]>('/electrician/bookings/pending'),
  active: () => api.get<Booking[]>('/electrician/bookings/active'),
  history: () => api.get<Booking[]>('/electrician/bookings/history'),
  respond: (bookingId: string, action: 'accept' | 'decline') =>
    api.put(`/electrician/booking/${bookingId}/respond`, { action }),
  updateStatus: (
    bookingId: string,
    status: 'on_the_way' | 'reached' | 'work_started' | 'completed',
  ) => api.put(`/electrician/job/${bookingId}/status`, { status }),
  uploadPhoto: (bookingId: string, formData: FormData) =>
    api.post(`/electrician/job/${bookingId}/photo`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
};

export const profileApi = {
  me: () => api.get<Electrician>('/electrician/me'),
  setAvailability: (online: boolean) =>
    api.put('/electrician/me/availability', { online }),
};
