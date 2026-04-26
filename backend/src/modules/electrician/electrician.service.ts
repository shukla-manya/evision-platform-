import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { DynamoService } from '../../common/dynamo/dynamo.service';
import { EmailService } from '../emails/email.service';
import { RegisterElectricianDto } from './dto/register-electrician.dto';
import { PushService } from '../push/push.service';
import { AuthService } from '../auth/auth.service';

@Injectable()
export class ElectricianService {
  private readonly logger = new Logger(ElectricianService.name);

  constructor(
    private dynamo: DynamoService,
    private email: EmailService,
    private config: ConfigService,
    private push: PushService,
    private auth: AuthService,
  ) {}

  private table() {
    return this.dynamo.tableName('electricians');
  }

  private parseSkills(skills?: string): string[] {
    if (!skills) return [];
    const raw = String(skills).trim();
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.map((s) => String(s).trim()).filter(Boolean);
      }
    } catch {
      // Fallback to comma-separated input.
    }
    return raw.split(',').map((s) => s.trim()).filter(Boolean);
  }

  private haversineKm(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number,
  ): number {
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return 6371 * c;
  }

  async findByEmail(email: string): Promise<Record<string, unknown> | null> {
    const items = await this.dynamo.query({
      TableName: this.table(),
      IndexName: 'EmailIndex',
      KeyConditionExpression: 'email = :email',
      ExpressionAttributeValues: { ':email': email },
      Limit: 1,
    });
    return items[0] || null;
  }

  async findByPhone(phone: string): Promise<Record<string, unknown> | null> {
    const items = await this.dynamo.query({
      TableName: this.table(),
      IndexName: 'PhoneIndex',
      KeyConditionExpression: 'phone = :phone',
      ExpressionAttributeValues: { ':phone': phone },
      Limit: 1,
    });
    return items[0] || null;
  }

  async register(
    dto: RegisterElectricianDto,
    docs: { aadhar_url: string; photo_url: string },
  ): Promise<{ message: string; electrician_id: string }> {
    const emailNorm = String(dto.email || '').trim().toLowerCase();
    if (!emailNorm) {
      throw new BadRequestException('Email is required');
    }

    const existing = await this.findByEmail(emailNorm);
    if (existing) throw new ConflictException('Email already registered');

    const existingPhone = await this.findByPhone(dto.phone);
    if (existingPhone) throw new ConflictException('Phone number already registered');

    const userAtPhone = await this.dynamo.query({
      TableName: this.dynamo.tableName('users'),
      IndexName: 'PhoneIndex',
      KeyConditionExpression: 'phone = :phone',
      ExpressionAttributeValues: { ':phone': dto.phone },
      Limit: 1,
    });
    if (userAtPhone[0]) {
      throw new ConflictException('This phone is already registered for a shopper account');
    }

    const userAtEmail = await this.dynamo.query({
      TableName: this.dynamo.tableName('users'),
      IndexName: 'EmailIndex',
      KeyConditionExpression: 'email = :email',
      ExpressionAttributeValues: { ':email': emailNorm },
      Limit: 1,
    });
    if (userAtEmail[0]) {
      throw new ConflictException('This email is already registered for a shopper account');
    }

    await this.auth.consumeRegistrationOtp(dto.phone, dto.otp);

    const id = uuidv4();
    const rawPwd = dto.password?.trim();
    const secret =
      rawPwd && rawPwd.length >= 8 ? rawPwd : `no_login_pwd_${uuidv4()}_${Date.now()}`;
    const passwordHash = await bcrypt.hash(secret, 12);
    const now = new Date().toISOString();
    const electrician = {
      id,
      name: dto.name,
      phone: dto.phone,
      email: emailNorm,
      password_hash: passwordHash,
      address: dto.address || null,
      lat: dto.lat ? Number(dto.lat) : null,
      lng: dto.lng ? Number(dto.lng) : null,
      available: true,
      rating_avg: 0,
      rating_count: 0,
      skills: this.parseSkills(dto.skills),
      aadhar_url: docs.aadhar_url,
      photo_url: docs.photo_url,
      status: 'pending',
      reject_reason: null,
      created_at: now,
      updated_at: now,
    };
    if (electrician.lat !== null && Number.isNaN(electrician.lat)) {
      throw new BadRequestException('Invalid latitude value');
    }
    if (electrician.lng !== null && Number.isNaN(electrician.lng)) {
      throw new BadRequestException('Invalid longitude value');
    }

    await this.dynamo.put(this.table(), electrician);
    this.logger.log(`Electrician registration submitted: ${emailNorm}`);

    const superadminEmail = this.config.get<string>('SUPERADMIN_EMAIL');
    if (superadminEmail) {
      const skillsStr = Array.isArray(electrician.skills)
        ? (electrician.skills as string[]).join(', ')
        : String(dto.skills || '').trim();
      await this.email.sendElectricianRegistered(superadminEmail, {
        name: dto.name,
        email: dto.email,
        phone: dto.phone,
        skills: skillsStr || undefined,
        address: dto.address ? String(dto.address) : undefined,
        aadhar_url: docs.aadhar_url,
        photo_url: docs.photo_url,
      });
    }
    return {
      message: 'Registration submitted. You will receive approval status by email.',
      electrician_id: id,
    };
  }

  async getPendingElectricians(): Promise<Record<string, unknown>[]> {
    const items = await this.dynamo.query({
      TableName: this.table(),
      IndexName: 'StatusIndex',
      KeyConditionExpression: '#s = :status',
      ExpressionAttributeNames: { '#s': 'status' },
      ExpressionAttributeValues: { ':status': 'pending' },
    });
    return items.map(({ password_hash, ...safe }) => safe);
  }

  async reviewBySuperadmin(
    id: string,
    action: 'approve' | 'reject',
    reason?: string,
  ): Promise<{ message: string; electrician_id: string; status: string }> {
    const electrician = await this.dynamo.get(this.table(), { id });
    if (!electrician) throw new NotFoundException('Electrician not found');
    if (String(electrician.status) !== 'pending') {
      throw new BadRequestException(`Electrician is already ${electrician.status}`);
    }

    const now = new Date().toISOString();
    if (action === 'approve') {
      const goesLive = (electrician as Record<string, unknown>).available !== false;
      await this.dynamo.update(this.table(), { id }, {
        status: 'approved',
        approved_at: now,
        updated_at: now,
        reject_reason: null,
        ...(goesLive ? { discovery_key: 'LIVE' } : {}),
      });
      const name = String(electrician.name || 'there');
      try {
        await this.email.sendElectricianApproved(String(electrician.email), { name });
      } catch (e) {
        this.logger.warn(`Electrician approved email failed: ${(e as Error).message}`);
      }
      await this.push.sendToToken(String((electrician as Record<string, unknown>).fcm_token || '').trim() || null, {
        title: "You're approved!",
        body: 'Go online in the app to start receiving job requests from customers near you.',
        data: { type: 'electrician_approved' },
      });
      return { message: 'Electrician approved', electrician_id: id, status: 'approved' };
    }

    const rejectReason = reason || 'Application did not meet verification requirements';
    await this.dynamo.update(this.table(), { id }, {
      status: 'rejected',
      rejected_at: now,
      updated_at: now,
      reject_reason: rejectReason,
    });
    const name = String(electrician.name || 'there');
    try {
      await this.email.sendElectricianRejected(String(electrician.email), {
        name,
        reason: rejectReason,
      });
    } catch (e) {
      this.logger.warn(`Electrician rejected email failed: ${(e as Error).message}`);
    }
    await this.push.sendToToken(String((electrician as Record<string, unknown>).fcm_token || '').trim() || null, {
      title: 'Your application needs an update',
      body: 'Please check your email for details.',
      data: { type: 'electrician_rejected' },
    });
    return { message: 'Electrician rejected', electrician_id: id, status: 'rejected' };
  }

  async findNearbyApprovedAvailable(
    lat: number,
    lng: number,
    radiusKm = 10,
  ): Promise<Record<string, unknown>[]> {
    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      throw new BadRequestException('lat and lng must be valid numbers');
    }
    const live = await this.dynamo.queryAllPages({
      TableName: this.table(),
      IndexName: 'LiveElectriciansIndex',
      KeyConditionExpression: 'discovery_key = :dk',
      ExpressionAttributeValues: { ':dk': 'LIVE' },
    });
    const legacy = await this.dynamo.queryAllPages({
      TableName: this.table(),
      IndexName: 'StatusIndex',
      KeyConditionExpression: '#s = :status',
      ExpressionAttributeNames: { '#s': 'status', '#a': 'available' },
      ExpressionAttributeValues: { ':status': 'approved', ':true': true },
      FilterExpression: 'attribute_not_exists(discovery_key) AND #a = :true',
    });
    const byId = new Map<string, Record<string, unknown>>();
    for (const e of [...live, ...legacy]) {
      const eid = String((e as Record<string, unknown>).id || '');
      if (eid && !byId.has(eid)) byId.set(eid, e as Record<string, unknown>);
    }
    const approved = [...byId.values()];

    const nearby = approved
      .filter((e) => Boolean(e.available))
      .map((e) => {
        const eLat = Number(e.lat);
        const eLng = Number(e.lng);
        if (Number.isNaN(eLat) || Number.isNaN(eLng)) return null;
        const distance = this.haversineKm(lat, lng, eLat, eLng);
        if (distance > radiusKm) return null;
        const { password_hash, ...safe } = e;
        return {
          ...safe,
          distance_km: Number(distance.toFixed(2)),
        };
      })
      .filter(Boolean) as Record<string, unknown>[];

    nearby.sort((a, b) => {
      const ra = Number(a.rating_avg || 0);
      const rb = Number(b.rating_avg || 0);
      if (rb !== ra) return rb - ra;
      const da = Number(a.distance_km ?? 999);
      const db = Number(b.distance_km ?? 999);
      return da - db;
    });
    return nearby;
  }

  async getMe(electricianId: string): Promise<Record<string, unknown>> {
    const electrician = await this.dynamo.get(this.table(), { id: electricianId });
    if (!electrician) throw new NotFoundException('Electrician not found');
    const { password_hash, ...safe } = electrician;
    return safe;
  }

  async getMyBookings(electricianId: string): Promise<Record<string, unknown>[]> {
    const items = await this.dynamo.queryAllPages({
      TableName: this.dynamo.tableName('service_bookings'),
      IndexName: 'ElectricianIndex',
      KeyConditionExpression: 'electrician_id = :eid',
      ExpressionAttributeValues: { ':eid': electricianId },
    });
    return (items as Record<string, unknown>[]).sort(
      (a, b) =>
        new Date(String(b.created_at || 0)).getTime() -
        new Date(String(a.created_at || 0)).getTime(),
    );
  }

  async getMyActiveBooking(electricianId: string): Promise<Record<string, unknown> | null> {
    const bookings = await this.getMyBookings(electricianId);
    return (
      bookings.find(
        (b) =>
          String(b.status) === 'accepted' && String(b.job_status) !== 'completed',
      ) || null
    );
  }

  async updateAvailability(
    electricianId: string,
    available: boolean,
  ): Promise<{ updated: boolean; available: boolean }> {
    const electrician = await this.dynamo.get(this.table(), { id: electricianId });
    if (!electrician) throw new NotFoundException('Electrician not found');
    const now = new Date().toISOString();
    const approved = String(electrician.status) === 'approved';
    if (available && approved) {
      await this.dynamo.update(this.table(), { id: electricianId }, {
        available: true,
        discovery_key: 'LIVE',
        updated_at: now,
      });
    } else if (!available) {
      await this.dynamo.update(
        this.table(),
        { id: electricianId },
        { available: false, updated_at: now },
        ['discovery_key'],
      );
    } else {
      await this.dynamo.update(this.table(), { id: electricianId }, {
        available,
        updated_at: now,
      });
    }
    return { updated: true, available };
  }

  async updateGeoCoords(
    electricianId: string,
    lat: number,
    lng: number,
  ): Promise<{ lat: number; lng: number; geo_captured_at: string }> {
    const electrician = await this.dynamo.get(this.table(), { id: electricianId });
    if (!electrician) throw new NotFoundException('Electrician not found');
    if (String(electrician.status || '').toLowerCase() !== 'approved') {
      throw new BadRequestException('Only approved technicians can update map coordinates');
    }
    const la = Number(lat);
    const ln = Number(lng);
    if (Number.isNaN(la) || Number.isNaN(ln) || la < -90 || la > 90 || ln < -180 || ln > 180) {
      throw new BadRequestException('Invalid lat/lng');
    }
    const now = new Date().toISOString();
    await this.dynamo.update(this.table(), { id: electricianId }, {
      lat: la,
      lng: ln,
      geo_captured_at: now,
      updated_at: now,
    });
    return { lat: la, lng: ln, geo_captured_at: now };
  }

  async updateFcmToken(
    electricianId: string,
    fcmToken: string,
  ): Promise<{ updated: boolean }> {
    const token = String(fcmToken || '').trim();
    if (!token) {
      throw new BadRequestException('fcm_token is required');
    }
    await this.dynamo.update(this.table(), { id: electricianId }, {
      fcm_token: token,
      updated_at: new Date().toISOString(),
    });
    return { updated: true };
  }

  async addJobPhoto(
    electricianId: string,
    bookingId: string,
    s3: import('../../common/s3/s3.service').S3Service,
    photo: Express.Multer.File,
  ): Promise<{ photo_url: string }> {
    const booking = await this.dynamo.get(this.dynamo.tableName('service_bookings'), { id: bookingId });
    if (!booking) throw new NotFoundException('Booking not found');
    if (String(booking.electrician_id) !== electricianId) {
      throw new BadRequestException('Booking does not belong to this electrician');
    }
    const photoUrl = await s3.upload(photo.buffer, photo.mimetype, 'job-photos');
    await this.dynamo.update(this.dynamo.tableName('service_bookings'), { id: bookingId }, {
      job_photo_url: photoUrl,
      updated_at: new Date().toISOString(),
    });
    return { photo_url: photoUrl };
  }

  async getPublicProfile(
    electricianId: string,
    reviewsService: { listForElectrician: (id: string) => Promise<Record<string, unknown>[]> },
  ): Promise<Record<string, unknown>> {
    const electrician = await this.dynamo.get(this.table(), { id: electricianId });
    if (!electrician) throw new NotFoundException('Electrician not found');
    if (String(electrician.status) !== 'approved') {
      throw new NotFoundException('Electrician not found');
    }
    const { password_hash, reject_reason, ...safe } = electrician;
    const reviews = await reviewsService.listForElectrician(electricianId);
    return { ...safe, reviews };
  }
}
