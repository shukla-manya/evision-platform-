import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';
import { ServiceService } from './service.service';

type SocketAuthUser = {
  id: string;
  role: string;
};

@WebSocketGateway({
  namespace: '/service-tracking',
  cors: {
    origin: '*',
    credentials: true,
  },
})
export class ServiceTrackingGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(ServiceTrackingGateway.name);

  @WebSocketServer()
  server: Server;

  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly service: ServiceService,
  ) {}

  private roomForBooking(bookingId: string) {
    return `booking:${bookingId}`;
  }

  private getAuthToken(client: Socket): string | null {
    const authToken = client.handshake.auth?.token;
    if (typeof authToken === 'string' && authToken.trim()) return authToken.trim();
    const rawHeader = client.handshake.headers.authorization;
    if (!rawHeader) return null;
    const header = String(rawHeader);
    if (header.toLowerCase().startsWith('bearer ')) {
      return header.slice(7).trim();
    }
    return header.trim() || null;
  }

  private getClientUser(client: Socket): SocketAuthUser {
    const cached = client.data.user as SocketAuthUser | undefined;
    if (cached?.id && cached?.role) return cached;
    throw new Error('Unauthorized socket');
  }

  handleConnection(client: Socket) {
    try {
      const token = this.getAuthToken(client);
      if (!token) {
        client.disconnect();
        return;
      }
      const payload = this.jwt.verify<Record<string, unknown>>(token, {
        secret: this.config.get<string>('JWT_SECRET'),
      });
      const id = String(payload?.sub || '');
      const role = String(payload?.role || '');
      if (!id || !role) {
        client.disconnect();
        return;
      }
      client.data.user = { id, role } satisfies SocketAuthUser;
      this.logger.debug(`Socket connected: ${client.id} (${role}:${id})`);
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.debug(`Socket disconnected: ${client.id}`);
  }

  @SubscribeMessage('join_booking_room')
  async handleJoinBookingRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { booking_id?: string },
  ) {
    const user = this.getClientUser(client);
    const bookingId = String(body?.booking_id || '');
    if (!bookingId) {
      client.emit('tracking_error', { message: 'booking_id is required' });
      return;
    }
    const canJoin = await this.service.canJoinTrackingRoom(user.id, user.role, bookingId);
    if (!canJoin) {
      client.emit('tracking_error', { message: 'Not allowed to join booking room' });
      return;
    }
    await client.join(this.roomForBooking(bookingId));
    client.emit('joined_booking_room', { booking_id: bookingId });
  }

  @SubscribeMessage('electrician_location_update')
  async handleElectricianLocationUpdate(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    body: { booking_id?: string; lat?: number; lng?: number; sent_at?: string },
  ) {
    const user = this.getClientUser(client);
    if (user.role !== 'electrician') {
      client.emit('tracking_error', { message: 'Only electricians can publish location' });
      return;
    }
    const bookingId = String(body?.booking_id || '');
    const lat = Number(body?.lat);
    const lng = Number(body?.lng);
    if (!bookingId || Number.isNaN(lat) || Number.isNaN(lng)) {
      client.emit('tracking_error', { message: 'booking_id, lat and lng are required' });
      return;
    }
    const allowed = await this.service.canPublishTrackingLocation(user.id, bookingId);
    if (!allowed) {
      client.emit('tracking_error', {
        message: 'Location allowed only for accepted bookings with job status on_the_way',
      });
      return;
    }
    const payload = {
      booking_id: bookingId,
      electrician_id: user.id,
      lat,
      lng,
      sent_at: body?.sent_at || new Date().toISOString(),
    };
    this.server.to(this.roomForBooking(bookingId)).emit('booking_location_update', payload);
  }
}
