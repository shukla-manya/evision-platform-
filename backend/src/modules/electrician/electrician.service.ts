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

@Injectable()
export class ElectricianService {
  private readonly logger = new Logger(ElectricianService.name);

  constructor(
    private dynamo: DynamoService,
    private email: EmailService,
    private config: ConfigService,
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

  async register(
    dto: RegisterElectricianDto,
    docs: { aadhar_url: string; photo_url: string },
  ): Promise<{ message: string; electrician_id: string }> {
    const existing = await this.findByEmail(dto.email);
    if (existing) throw new ConflictException('Email already registered');

    const id = uuidv4();
    const passwordHash = await bcrypt.hash(dto.password, 12);
    const now = new Date().toISOString();
    const electrician = {
      id,
      name: dto.name,
      phone: dto.phone,
      email: dto.email,
      password_hash: passwordHash,
      address: dto.address || null,
      lat: Number(dto.lat),
      lng: Number(dto.lng),
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
    if (Number.isNaN(electrician.lat) || Number.isNaN(electrician.lng)) {
      throw new BadRequestException('Invalid lat/lng values');
    }

    await this.dynamo.put(this.table(), electrician);
    this.logger.log(`Electrician registration submitted: ${dto.email}`);

    const superadminEmail = this.config.get<string>('SUPERADMIN_EMAIL');
    if (superadminEmail) {
      await this.email.sendElectricianRegistered(superadminEmail, {
        name: dto.name,
        email: dto.email,
        phone: dto.phone,
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
      await this.dynamo.update(this.table(), { id }, {
        status: 'approved',
        approved_at: now,
        updated_at: now,
        reject_reason: null,
      });
      await this.email.sendElectricianApproved(String(electrician.email), {
        name: String(electrician.name || 'Electrician'),
      });
      return { message: 'Electrician approved', electrician_id: id, status: 'approved' };
    }

    await this.dynamo.update(this.table(), { id }, {
      status: 'rejected',
      rejected_at: now,
      updated_at: now,
      reject_reason: reason || 'Application did not meet verification requirements',
    });
    await this.email.sendElectricianRejected(String(electrician.email), {
      name: String(electrician.name || 'Electrician'),
      reason: reason || 'Application did not meet verification requirements',
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
    const approved = await this.dynamo.query({
      TableName: this.table(),
      IndexName: 'StatusIndex',
      KeyConditionExpression: '#s = :status',
      ExpressionAttributeNames: { '#s': 'status' },
      ExpressionAttributeValues: { ':status': 'approved' },
    });

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

    nearby.sort((a, b) => Number(b.rating_avg || 0) - Number(a.rating_avg || 0));
    return nearby;
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
