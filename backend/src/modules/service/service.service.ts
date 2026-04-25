import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { DynamoService } from '../../common/dynamo/dynamo.service';
import { S3Service } from '../../common/s3/s3.service';
import { EmailService } from '../emails/email.service';
import { PushService } from '../push/push.service';
import { CreateServiceRequestDto } from './dto/create-service-request.dto';
import { BookServiceDto } from './dto/book-service.dto';
import { RespondBookingDto } from './dto/respond-booking.dto';

@Injectable()
export class ServiceService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ServiceService.name);
  private expiryTimer: NodeJS.Timeout | null = null;

  constructor(
    private dynamo: DynamoService,
    private s3: S3Service,
    private email: EmailService,
    private push: PushService,
  ) {}

  onModuleInit() {
    this.expiryTimer = setInterval(() => {
      void this.expirePendingBookings().catch((err) => {
        this.logger.warn(`Booking expiry job failed: ${err?.message || err}`);
      });
    }, 5 * 60 * 1000);
  }

  onModuleDestroy() {
    if (this.expiryTimer) clearInterval(this.expiryTimer);
  }

  private requestsTable() {
    return this.dynamo.tableName('service_requests');
  }

  private bookingsTable() {
    return this.dynamo.tableName('service_bookings');
  }

  private usersTable() {
    return this.dynamo.tableName('users');
  }

  private electriciansTable() {
    return this.dynamo.tableName('electricians');
  }

  async createRequest(
    userId: string,
    dto: CreateServiceRequestDto,
    photo: Express.Multer.File,
  ): Promise<Record<string, unknown>> {
    if (!photo) throw new BadRequestException('photo is required');
    const photoUrl = await this.s3.upload(photo.buffer, photo.mimetype, 'service-requests');
    const now = new Date().toISOString();
    const request = {
      id: uuidv4(),
      customer_id: userId,
      issue: dto.issue,
      photo_url: photoUrl,
      preferred_date: dto.preferred_date,
      time_from: dto.time_from,
      time_to: dto.time_to,
      lat: Number(dto.lat),
      lng: Number(dto.lng),
      status: 'open',
      created_at: now,
      updated_at: now,
    };
    if (Number.isNaN(request.lat) || Number.isNaN(request.lng)) {
      throw new BadRequestException('lat and lng must be valid numbers');
    }
    await this.dynamo.put(this.requestsTable(), request);
    return request;
  }

  async bookElectrician(
    customerId: string,
    electricianId: string,
    dto: BookServiceDto,
  ): Promise<Record<string, unknown>> {
    const [request, electrician, customer] = await Promise.all([
      this.dynamo.get(this.requestsTable(), { id: dto.service_request_id }),
      this.dynamo.get(this.electriciansTable(), { id: electricianId }),
      this.dynamo.get(this.usersTable(), { id: customerId }),
    ]);
    if (!request || String(request.customer_id) !== customerId) {
      throw new NotFoundException('Service request not found');
    }
    if (!electrician) throw new NotFoundException('Electrician not found');
    if (String(electrician.status) !== 'approved' || !Boolean(electrician.available)) {
      throw new BadRequestException('Electrician is not available for booking');
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString();
    const booking = {
      id: uuidv4(),
      request_id: String(request.id),
      customer_id: customerId,
      electrician_id: electricianId,
      status: 'pending',
      expires_at: expiresAt,
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    };
    await this.dynamo.put(this.bookingsTable(), booking);
    await this.dynamo.update(
      this.requestsTable(),
      { id: String(request.id) },
      {
        status: 'booked',
        booked_electrician_id: electricianId,
        updated_at: now.toISOString(),
      },
    );

    const issue = String(request.issue || 'service request');
    await Promise.all([
      this.push.sendToToken(String(electrician.fcm_token || ''), {
        title: 'New Service Booking Request',
        body: `You have a new request for "${issue}". Respond within 2 hours.`,
        data: { type: 'service_booking_request', booking_id: String(booking.id) },
      }),
      electrician.email
        ? this.email.sendServiceBookingRequestToElectrician(String(electrician.email), {
            electricianName: String(electrician.name || 'Electrician'),
            issue,
            expiresAt,
          })
        : Promise.resolve(),
    ]);

    if (customer?.email) {
      await this.email.sendClientBookingPending(String(customer.email), {
        customerName: String(customer.name || 'Customer'),
        electricianName: String(electrician.name || 'Electrician'),
      });
    }
    return booking;
  }

  async respondToBooking(
    electricianUserId: string,
    bookingId: string,
    dto: RespondBookingDto,
  ): Promise<Record<string, unknown>> {
    const booking = await this.dynamo.get(this.bookingsTable(), { id: bookingId });
    if (!booking) throw new NotFoundException('Booking not found');
    if (String(booking.electrician_id) !== electricianUserId) {
      throw new BadRequestException('Booking does not belong to this electrician');
    }
    if (String(booking.status) !== 'pending') {
      throw new BadRequestException(`Cannot respond to booking in status ${booking.status}`);
    }
    const expiresAtMs = new Date(String(booking.expires_at)).getTime();
    if (!Number.isNaN(expiresAtMs) && Date.now() > expiresAtMs) {
      throw new BadRequestException('Booking has already expired');
    }

    const [customer, electrician, request] = await Promise.all([
      this.dynamo.get(this.usersTable(), { id: String(booking.customer_id) }),
      this.dynamo.get(this.electriciansTable(), { id: electricianUserId }),
      this.dynamo.get(this.requestsTable(), { id: String(booking.request_id) }),
    ]);

    const now = new Date().toISOString();
    if (dto.action === 'accept') {
      await this.dynamo.update(this.bookingsTable(), { id: bookingId }, {
        status: 'accepted',
        accepted_at: now,
        updated_at: now,
      });
      if (request) {
        await this.dynamo.update(this.requestsTable(), { id: String(request.id) }, {
          status: 'in_progress',
          updated_at: now,
        });
      }
      if (customer?.email) {
        await this.email.sendClientBookingAccepted(String(customer.email), {
          customerName: String(customer.name || 'Customer'),
          electricianName: String(electrician?.name || 'Electrician'),
          electricianPhone: String(electrician?.phone || ''),
        });
      }
      await this.push.sendToToken(String(customer?.fcm_token || ''), {
        title: 'Service Booking Confirmed',
        body: `Your booking has been accepted by ${String(electrician?.name || 'electrician')}.`,
        data: { type: 'service_booking_accepted', booking_id: bookingId },
      });
      return { booking_id: bookingId, status: 'accepted' };
    }

    await this.dynamo.update(this.bookingsTable(), { id: bookingId }, {
      status: 'declined',
      declined_at: now,
      updated_at: now,
    });
    if (request) {
      await this.dynamo.update(this.requestsTable(), { id: String(request.id) }, {
        status: 'open',
        booked_electrician_id: null,
        updated_at: now,
      });
    }
    if (customer?.email) {
      await this.email.sendClientBookingDeclined(String(customer.email), {
        customerName: String(customer.name || 'Customer'),
        electricianName: String(electrician?.name || 'Electrician'),
      });
    }
    await this.push.sendToToken(String(customer?.fcm_token || ''), {
      title: 'Booking Declined',
      body: 'Electrician declined your request. Please pick another electrician.',
      data: { type: 'service_booking_declined', booking_id: bookingId },
    });
    return { booking_id: bookingId, status: 'declined' };
  }

  async expirePendingBookings(): Promise<{ expired: number }> {
    const pending = await this.dynamo.query({
      TableName: this.bookingsTable(),
      IndexName: 'StatusIndex',
      KeyConditionExpression: '#s = :status',
      ExpressionAttributeNames: { '#s': 'status' },
      ExpressionAttributeValues: { ':status': 'pending' },
    });
    const now = Date.now();
    const expired = pending.filter((b) => {
      const expiresAt = new Date(String(b.expires_at || '')).getTime();
      return !Number.isNaN(expiresAt) && expiresAt <= now;
    });
    if (!expired.length) return { expired: 0 };

    await Promise.all(
      expired.map(async (booking) => {
        const bookingId = String(booking.id);
        const requestId = String(booking.request_id || '');
        await this.dynamo.update(this.bookingsTable(), { id: bookingId }, {
          status: 'expired',
          expired_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
        if (requestId) {
          await this.dynamo.update(this.requestsTable(), { id: requestId }, {
            status: 'open',
            booked_electrician_id: null,
            updated_at: new Date().toISOString(),
          });
        }
        const customer = await this.dynamo.get(this.usersTable(), {
          id: String(booking.customer_id),
        });
        if (customer?.email) {
          await this.email.sendClientBookingExpired(String(customer.email), {
            customerName: String(customer.name || 'Customer'),
          });
        }
        await this.push.sendToToken(String(customer?.fcm_token || ''), {
          title: 'Booking Expired',
          body: 'Your booking request expired. Please choose another electrician.',
          data: { type: 'service_booking_expired', booking_id: bookingId },
        });
      }),
    );
    this.logger.log(`Expired ${expired.length} pending service booking(s)`);
    return { expired: expired.length };
  }
}
