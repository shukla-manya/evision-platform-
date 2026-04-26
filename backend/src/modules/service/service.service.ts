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
import { UpdateJobStatusDto } from './dto/update-job-status.dto';

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

  private async getElectricianByUserId(userId: string): Promise<Record<string, unknown> | null> {
    const byId = await this.dynamo.get(this.electriciansTable(), { id: userId });
    if (byId) return byId;
    const byUserIndex = await this.dynamo.query({
      TableName: this.electriciansTable(),
      IndexName: 'UserIndex',
      KeyConditionExpression: 'user_id = :uid',
      ExpressionAttributeValues: { ':uid': userId },
      Limit: 1,
    });
    return byUserIndex[0] || null;
  }

  private haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return 6371 * c;
  }

  private async enrichElectricianBookings(
    rows: Record<string, unknown>[],
    electricianUserId: string,
  ): Promise<Record<string, unknown>[]> {
    if (!rows.length) return [];
    const electrician = await this.dynamo.get(this.electriciansTable(), { id: electricianUserId });
    const eLat = Number(electrician?.lat);
    const eLng = Number(electrician?.lng);

    return Promise.all(
      rows.map(async (row) => {
        const [customer, request] = await Promise.all([
          this.dynamo.get(this.usersTable(), { id: String(row.customer_id || '') }),
          this.dynamo.get(this.requestsTable(), { id: String(row.request_id || '') }),
        ]);
        const req = request as Record<string, unknown> | null;
        let distance_km: number | undefined;
        if (req && !Number.isNaN(eLat) && !Number.isNaN(eLng)) {
          const rl = Number(req.lat);
          const rlg = Number(req.lng);
          if (!Number.isNaN(rl) && !Number.isNaN(rlg)) {
            distance_km = Number(this.haversineKm(eLat, eLng, rl, rlg).toFixed(2));
          }
        }
        return {
          ...row,
          customer_name: customer?.name != null ? String(customer.name) : null,
          customer_phone: customer?.phone != null ? String(customer.phone) : null,
          issue: req ? String(req.issue || '') : null,
          product_name: req?.product_label != null ? String(req.product_label) : null,
          service_address: req?.service_address != null ? String(req.service_address) : null,
          preferred_date: req?.preferred_date ?? null,
          time_from: req?.time_from ?? null,
          time_to: req?.time_to ?? null,
          ...(distance_km !== undefined ? { distance_km } : {}),
        };
      }),
    );
  }

  async createRequest(
    userId: string,
    dto: CreateServiceRequestDto,
    photo: Express.Multer.File,
  ): Promise<Record<string, unknown>> {
    const photoUrl = photo
      ? await this.s3.upload(photo.buffer, photo.mimetype, 'service-requests')
      : null;
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
      order_sub_order_id: dto.order_sub_order_id || null,
      product_label: dto.product_label || null,
      service_address: dto.service_address || null,
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
      /** Mirrors customer_id for UserIndex (evision_service_bookings). */
      user_id: customerId,
      electrician_id: electricianId,
      status: 'pending',
      job_status: null,
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
    const customerName = String(customer?.name || 'Customer');
    const issueSummary = issue.length > 80 ? `${issue.slice(0, 77)}…` : issue;
    await Promise.all([
      this.push.sendToToken(String(electrician.fcm_token || ''), {
        title: 'New booking',
        body: `New booking request from ${customerName} — ${issueSummary}. Respond within 2 hours.`,
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
        job_status: 'accepted',
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
      job_status: null,
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
          job_status: null,
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

  async updateJobStatus(
    electricianUserId: string,
    bookingId: string,
    dto: UpdateJobStatusDto,
  ): Promise<Record<string, unknown>> {
    const booking = await this.dynamo.get(this.bookingsTable(), { id: bookingId });
    if (!booking) throw new NotFoundException('Booking not found');
    if (String(booking.electrician_id) !== electricianUserId) {
      throw new BadRequestException('Booking does not belong to this electrician');
    }
    if (String(booking.status) !== 'accepted') {
      throw new BadRequestException('Job status can be updated only for accepted bookings');
    }

    const [customer, electrician, request] = await Promise.all([
      this.dynamo.get(this.usersTable(), { id: String(booking.customer_id) }),
      this.dynamo.get(this.electriciansTable(), { id: electricianUserId }),
      this.dynamo.get(this.requestsTable(), { id: String(booking.request_id) }),
    ]);

    const now = new Date().toISOString();
    await this.dynamo.update(this.bookingsTable(), { id: bookingId }, {
      job_status: dto.status,
      updated_at: now,
    });
    if (dto.status === 'completed' && request) {
      await this.dynamo.update(this.requestsTable(), { id: String(request.id) }, {
        status: 'completed',
        completed_at: now,
        updated_at: now,
      });
    }

    const readableStatus = dto.status.replace(/_/g, ' ');
    if (customer?.email) {
      await this.email.sendClientJobStatusUpdate(String(customer.email), {
        customerName: String(customer.name || 'Customer'),
        electricianName: String(electrician?.name || 'Electrician'),
        status: readableStatus,
      });
      if (dto.status === 'completed') {
        await this.email.sendClientReviewPrompt(String(customer.email), {
          customerName: String(customer.name || 'Customer'),
          electricianName: String(electrician?.name || 'Electrician'),
        });
      }
    }
    await this.push.sendToToken(String(customer?.fcm_token || ''), {
      title: `Job update: ${readableStatus}`,
      body:
        dto.status === 'completed'
          ? `Work completed by ${String(electrician?.name || 'electrician')}. Please add a review.`
          : `${String(electrician?.name || 'Electrician')} is now ${readableStatus}.`,
      data: {
        type: dto.status === 'completed' ? 'job_completed_review_prompt' : 'job_status_update',
        booking_id: bookingId,
        status: dto.status,
      },
    });
    return { booking_id: bookingId, job_status: dto.status };
  }

  async listElectricianBookings(
    electricianUserId: string,
    scope: 'pending' | 'active' | 'history',
  ): Promise<Record<string, unknown>[]> {
    const rows = await this.dynamo.query({
      TableName: this.bookingsTable(),
      IndexName: 'ElectricianIndex',
      KeyConditionExpression: 'electrician_id = :electricianId',
      ExpressionAttributeValues: { ':electricianId': electricianUserId },
    });
    const filtered = rows.filter((row) => {
      const status = String(row.status || '');
      const jobStatus = String(row.job_status || '');
      if (scope === 'pending') return status === 'pending';
      if (scope === 'active') {
        return status === 'accepted' && jobStatus !== 'completed';
      }
      return status === 'accepted' && jobStatus === 'completed';
    });
    filtered.sort(
      (a, b) =>
        new Date(String(b.updated_at || b.created_at || 0)).getTime() -
        new Date(String(a.updated_at || a.created_at || 0)).getTime(),
    );
    return this.enrichElectricianBookings(filtered, electricianUserId);
  }

  async listCustomerActiveBookings(customerId: string): Promise<Record<string, unknown>[]> {
    let bookings: Record<string, unknown>[];
    try {
      bookings = await this.dynamo.queryAllPages({
        TableName: this.bookingsTable(),
        IndexName: 'UserIndex',
        KeyConditionExpression: 'user_id = :uid',
        ExpressionAttributeValues: { ':uid': customerId },
      });
    } catch {
      bookings = [];
    }
    if (!bookings.length) {
      const all = await this.dynamo.scanAllPages({ TableName: this.bookingsTable() });
      bookings = all.filter((row) => String(row.customer_id || '') === customerId);
    }
    return bookings
      .filter(
        (row) =>
          String(row.customer_id || '') === customerId &&
          String(row.status || '') === 'accepted' &&
          String(row.job_status || '') !== 'completed',
      )
      .sort(
        (a, b) =>
          new Date(String(b.updated_at || b.created_at || 0)).getTime() -
          new Date(String(a.updated_at || a.created_at || 0)).getTime(),
      );
  }

  async listCustomerBookingHistory(customerId: string): Promise<Record<string, unknown>[]> {
    let bookings: Record<string, unknown>[];
    try {
      bookings = await this.dynamo.queryAllPages({
        TableName: this.bookingsTable(),
        IndexName: 'UserIndex',
        KeyConditionExpression: 'user_id = :uid',
        ExpressionAttributeValues: { ':uid': customerId },
      });
    } catch {
      bookings = [];
    }
    if (!bookings.length) {
      const all = await this.dynamo.scanAllPages({ TableName: this.bookingsTable() });
      bookings = all.filter((row) => String(row.customer_id || '') === customerId);
    }
    const mine = bookings.filter(
      (row) =>
        String(row.customer_id || '') === customerId &&
        String(row.status || '') === 'accepted' &&
        String(row.job_status || '') === 'completed',
    );
    mine.sort(
      (a, b) =>
        new Date(String(b.updated_at || b.created_at || 0)).getTime() -
        new Date(String(a.updated_at || a.created_at || 0)).getTime(),
    );
    return Promise.all(
      mine.map(async (b) => {
        const request = await this.dynamo.get(this.requestsTable(), { id: String(b.request_id || '') });
        const electrician = await this.dynamo.get(this.electriciansTable(), {
          id: String(b.electrician_id || ''),
        });
        return {
          ...b,
          request_summary: request
            ? {
                id: request.id,
                issue: request.issue,
                lat: request.lat,
                lng: request.lng,
              }
            : null,
          electrician_name: electrician ? String(electrician.name || '') : null,
        };
      }),
    );
  }

  async getCustomerBookingDetail(
    customerId: string,
    bookingId: string,
  ): Promise<Record<string, unknown>> {
    const booking = await this.dynamo.get(this.bookingsTable(), { id: bookingId });
    if (!booking || String(booking.customer_id || '') !== customerId) {
      throw new NotFoundException('Booking not found');
    }
    const request = await this.dynamo.get(this.requestsTable(), { id: String(booking.request_id || '') });
    const electrician = await this.dynamo.get(this.electriciansTable(), {
      id: String(booking.electrician_id || ''),
    });
    let electricianSafe: Record<string, unknown> | null = null;
    if (electrician) {
      const { password_hash: _pw, ...rest } = electrician as Record<string, unknown>;
      void _pw;
      electricianSafe = rest;
    }
    return {
      booking,
      request: request || null,
      electrician: electricianSafe,
    };
  }

  async setElectricianAvailability(
    electricianUserId: string,
    online: boolean,
  ): Promise<{ online: boolean }> {
    const electrician = await this.getElectricianByUserId(electricianUserId);
    if (!electrician) throw new NotFoundException('Electrician profile not found');
    if (String(electrician.status || '') !== 'approved') {
      throw new BadRequestException('Availability can be updated only after your account is approved');
    }
    await this.dynamo.update(
      this.electriciansTable(),
      { id: String(electrician.id) },
      { available: online, updated_at: new Date().toISOString() },
    );
    return { online };
  }

  async uploadJobPhoto(
    electricianUserId: string,
    bookingId: string,
    photo: Express.Multer.File,
  ): Promise<{ booking_id: string; photo_url: string }> {
    if (!photo) throw new BadRequestException('photo is required');
    const booking = await this.dynamo.get(this.bookingsTable(), { id: bookingId });
    if (!booking) throw new NotFoundException('Booking not found');
    if (String(booking.electrician_id) !== electricianUserId) {
      throw new BadRequestException('Booking does not belong to this electrician');
    }
    const photoUrl = await this.s3.upload(photo.buffer, photo.mimetype, 'service-work-photos');
    await this.dynamo.update(this.bookingsTable(), { id: bookingId }, {
      work_photo_url: photoUrl,
      updated_at: new Date().toISOString(),
    });
    return { booking_id: bookingId, photo_url: photoUrl };
  }

  async canJoinTrackingRoom(userId: string, role: string, bookingId: string): Promise<boolean> {
    const booking = await this.dynamo.get(this.bookingsTable(), { id: bookingId });
    if (!booking) return false;
    if (role === 'electrician') return String(booking.electrician_id) === userId;
    if (role === 'customer' || role === 'dealer') return String(booking.customer_id) === userId;
    return false;
  }

  async canPublishTrackingLocation(electricianUserId: string, bookingId: string): Promise<boolean> {
    const booking = await this.dynamo.get(this.bookingsTable(), { id: bookingId });
    if (!booking) return false;
    return (
      String(booking.electrician_id) === electricianUserId &&
      String(booking.status) === 'accepted' &&
      String(booking.job_status) === 'on_the_way'
    );
  }
}
