import { io, Socket } from 'socket.io-client';
import { API_BASE_URL } from './api';

let socket: Socket | null = null;

function normalizeSocketBaseUrl() {
  return API_BASE_URL.replace(/\/+$/, '');
}

export function createTrackingSocket(token: string): Socket {
  return io(`${normalizeSocketBaseUrl()}/service-tracking`, {
    transports: ['websocket'],
    auth: { token },
  });
}

export function connectSocket(token: string): Socket {
  if (socket?.connected) return socket;
  socket = io(`${normalizeSocketBaseUrl()}/service-tracking`, {
    auth: { token },
    transports: ['websocket'],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 2000,
  });
  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}

export function getSocket(): Socket | null {
  return socket;
}

export function emitLocation(bookingId: string, lat: number, lng: number) {
  socket?.emit('electrician_location_update', {
    booking_id: bookingId,
    lat,
    lng,
    sent_at: new Date().toISOString(),
  });
}

export function joinRoom(bookingId: string) {
  socket?.emit('join_booking_room', { booking_id: bookingId });
}

export type LocationUpdate = {
  electrician_id?: string;
  lat: number;
  lng: number;
  booking_id: string;
  sent_at: string;
};

export function onElectricianLocation(callback: (data: LocationUpdate) => void): () => void {
  socket?.on('booking_location_update', callback);
  return () => socket?.off('booking_location_update', callback);
}
