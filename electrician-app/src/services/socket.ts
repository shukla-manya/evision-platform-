import { io, Socket } from 'socket.io-client';
import { API_BASE_URL } from './api';

let socket: Socket | null = null;

export function connectSocket(token: string): Socket {
  if (socket?.connected) return socket;
  socket = io(`${API_BASE_URL.replace(/\/+$/, '')}/location`, {
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

// Electrician calls this every 4 seconds when job_status = on_the_way
export function emitLocation(bookingId: string, lat: number, lng: number) {
  socket?.emit('location_update', { booking_id: bookingId, lat, lng });
}

// Customer calls these to receive the electrician's live position
export function joinRoom(bookingId: string) {
  socket?.emit('join_room', { booking_id: bookingId });
}

export function leaveRoom(bookingId: string) {
  socket?.emit('leave_room', { booking_id: bookingId });
}

export type LocationUpdate = {
  lat: number;
  lng: number;
  booking_id: string;
  timestamp: string;
};

export function onElectricianLocation(callback: (data: LocationUpdate) => void): () => void {
  socket?.on('electrician_location', callback);
  return () => socket?.off('electrician_location', callback);
}
