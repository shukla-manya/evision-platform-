import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

function normalizeBase(url: string) {
  return url.replace(/\/+$/, '');
}

export function connectTrackingSocket(token: string): Socket {
  if (socket?.connected) return socket;
  const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
  socket = io(`${normalizeBase(base)}/service-tracking`, {
    transports: ['websocket'],
    auth: { token },
    reconnection: true,
  });
  return socket;
}

export function disconnectTrackingSocket() {
  socket?.disconnect();
  socket = null;
}

export function joinBookingRoom(bookingId: string) {
  socket?.emit('join_booking_room', { booking_id: bookingId });
}

export function emitElectricianLocation(bookingId: string, lat: number, lng: number) {
  socket?.emit('electrician_location_update', {
    booking_id: bookingId,
    lat,
    lng,
    sent_at: new Date().toISOString(),
  });
}

export type BookingLocationUpdate = {
  booking_id: string;
  electrician_id?: string;
  lat: number;
  lng: number;
  sent_at: string;
};

export function onBookingLocationUpdate(cb: (payload: BookingLocationUpdate) => void): () => void {
  socket?.on('booking_location_update', cb);
  return () => socket?.off('booking_location_update', cb);
}
