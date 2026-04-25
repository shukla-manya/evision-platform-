import { io, Socket } from 'socket.io-client';
import { API_BASE_URL } from './api';

function normalizeSocketBaseUrl() {
  return API_BASE_URL.replace(/\/+$/, '');
}

export function createTrackingSocket(token: string): Socket {
  return io(`${normalizeSocketBaseUrl()}/service-tracking`, {
    transports: ['websocket'],
    auth: { token },
  });
}
