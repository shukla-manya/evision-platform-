import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';

interface LocationPayload {
  booking_id: string;
  lat: number;
  lng: number;
}

interface RoomPayload {
  booking_id: string;
}

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/location',
})
export class LocationGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(LocationGateway.name);

  constructor(private jwt: JwtService) {}

  handleConnection(socket: Socket) {
    const token = (socket.handshake.auth?.token as string | undefined)
      || (socket.handshake.headers?.authorization as string | undefined)?.replace('Bearer ', '');
    if (!token) {
      socket.disconnect();
      return;
    }
    try {
      const payload = this.jwt.verify<{ sub: string; role: string }>(token);
      socket.data.userId = payload.sub;
      socket.data.role = payload.role;
      this.logger.log(`Connected: ${socket.id} role=${payload.role}`);
    } catch {
      socket.disconnect();
    }
  }

  handleDisconnect(socket: Socket) {
    this.logger.log(`Disconnected: ${socket.id}`);
  }

  @SubscribeMessage('join_room')
  handleJoinRoom(
    @ConnectedSocket() socket: Socket,
    @MessageBody() payload: RoomPayload,
  ) {
    if (!payload?.booking_id) return { error: 'booking_id required' };
    const room = `booking:${payload.booking_id}`;
    void socket.join(room);
    this.logger.log(`${socket.id} joined ${room}`);
    return { joined: room };
  }

  @SubscribeMessage('leave_room')
  handleLeaveRoom(
    @ConnectedSocket() socket: Socket,
    @MessageBody() payload: RoomPayload,
  ) {
    if (!payload?.booking_id) return;
    const room = `booking:${payload.booking_id}`;
    void socket.leave(room);
    return { left: room };
  }

  // Electrician emits this every few seconds when job_status = on_the_way
  @SubscribeMessage('location_update')
  handleLocationUpdate(
    @ConnectedSocket() socket: Socket,
    @MessageBody() payload: LocationPayload,
  ) {
    if (socket.data.role !== 'electrician') return;
    if (!payload?.booking_id || payload.lat == null || payload.lng == null) return;
    const room = `booking:${payload.booking_id}`;
    socket.to(room).emit('electrician_location', {
      lat: Number(payload.lat),
      lng: Number(payload.lng),
      booking_id: payload.booking_id,
      timestamp: new Date().toISOString(),
    });
  }
}
