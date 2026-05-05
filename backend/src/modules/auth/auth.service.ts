import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  ConflictException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { DynamoService } from '../../common/dynamo/dynamo.service';
import { normalizeClientIp } from '../../common/http/client-ip.util';
import { LoginDto, RegisterDto, SuperadminLoginDto } from './dto/register.dto';
import type { AddressBookEntryDto } from './dto/update-address-book.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private dynamo: DynamoService,
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

  private normalizeEmail(raw: string): string {
    return String(raw || '').trim().toLowerCase();
  }

  async login(dto: LoginDto): Promise<{ access_token: string; electrician_status?: 'pending' | 'rejected' }> {
    const email = this.normalizeEmail(dto.email);

    const user = await this.findUserByEmail(email);
    if (user) {
      const hash = String(user.password_hash || '');
      if (!hash || !(await bcrypt.compare(dto.password, hash))) {
        throw new UnauthorizedException('Invalid email or password');
      }
      const token = this.signToken(String(user.id), String(user.role), email, String(user.phone || ''));
      return { access_token: token };
    }

    const electrician = await this.findElectricianByEmail(email);
    if (electrician) {
      const hash = String(electrician.password_hash || '');
      if (!hash || !(await bcrypt.compare(dto.password, hash))) {
        throw new UnauthorizedException('Invalid email or password');
      }
      const ph = String(electrician.phone || '');
      const st = String(electrician.status || '').toLowerCase();
      if (st === 'approved') {
        return { access_token: this.signToken(String(electrician.id), 'electrician', email, ph) };
      }
      if (st === 'pending') {
        return {
          access_token: this.signToken(String(electrician.id), 'electrician_pending', email, ph),
          electrician_status: 'pending',
        };
      }
      if (st === 'rejected') {
        return {
          access_token: this.signToken(String(electrician.id), 'electrician_rejected', email, ph),
          electrician_status: 'rejected',
        };
      }
      throw new UnauthorizedException('Technician account is not available for sign-in.');
    }

    throw new UnauthorizedException('Invalid email or password');
  }

  // ── Registration ──────────────────────────────────────────────────────────
  async register(dto: RegisterDto): Promise<{ access_token: string; user: any }> {
    const emailNorm = String(dto.email || '').trim().toLowerCase();
    await this.consumeOtp(emailNorm, dto.otp);
    if (dto.role === 'dealer' && !dto.gst_no) {
      throw new BadRequestException('GST number is required for dealer accounts');
    }
    if (dto.role === 'dealer') {
      if (!String(dto.business_name || '').trim()) {
        throw new BadRequestException('Business name is required for dealer accounts');
      }
      if (!String(dto.business_address || '').trim()) {
        throw new BadRequestException('Business address is required for dealer accounts');
      }
      if (!String(dto.business_city || '').trim()) {
        throw new BadRequestException('Business city is required for dealer accounts');
      }
      const bp = String(dto.business_pincode || '').replace(/\D/g, '');
      if (!/^\d{6}$/.test(bp)) {
        throw new BadRequestException('A valid 6-digit business pincode is required for dealer accounts');
      }
    }

    if (!emailNorm) {
      throw new BadRequestException('Email is required');
    }

    const [existingPhone, existingEmail, electricianPhone, electricianEmail] = await Promise.all([
      this.findUserByPhone(dto.phone),
      this.findUserByEmail(emailNorm),
      this.findElectricianByPhone(dto.phone),
      this.findElectricianByEmail(emailNorm),
    ]);

    if (existingPhone) throw new ConflictException('Phone number already registered');
    if (existingEmail) throw new ConflictException('Email already registered');
    if (electricianPhone) {
      throw new ConflictException('This phone number is already used for a technician account');
    }
    if (electricianEmail) {
      throw new ConflictException('Email already registered for a technician account');
    }

    const id = uuidv4();
    const addressBook = dto.address?.trim()
      ? [
          {
            label: dto.role === 'dealer' ? 'Business' : 'Home',
            address: String(dto.address).trim(),
            is_default: true,
          },
        ]
      : [];

    let regLat: number | null = null;
    let regLng: number | null = null;
    let geo_captured_at: string | null = null;
    if (dto.lat != null && dto.lng != null) {
      const la = Number(dto.lat);
      const ln = Number(dto.lng);
      if (!Number.isNaN(la) && !Number.isNaN(ln) && la >= -90 && la <= 90 && ln >= -180 && ln <= 180) {
        regLat = la;
        regLng = ln;
        geo_captured_at = new Date().toISOString();
      }
    }

    const user = {
      id,
      name: dto.name,
      phone: dto.phone,
      email: emailNorm,
      password_hash: null,
      role: dto.role,
      gst_no: dto.gst_no || null,
      gst_verified: dto.role === 'dealer' ? false : undefined,
      business_name: dto.role === 'dealer' ? String(dto.business_name || '').trim() : null,
      business_address: dto.role === 'dealer' ? String(dto.business_address || '').trim() : null,
      business_city: dto.role === 'dealer' ? String(dto.business_city || '').trim() : null,
      business_pincode: dto.role === 'dealer' ? String(dto.business_pincode || '').replace(/\D/g, '').slice(0, 6) : null,
      fcm_token: null,
      address_book: addressBook,
      lat: regLat,
      lng: regLng,
      geo_captured_at,
      created_at: new Date().toISOString(),
    };

    await this.dynamo.put(this.dynamo.tableName('users'), user);

    const token = this.signToken(id, dto.role, emailNorm, dto.phone);
    const { ...safeUser } = user;
    return { access_token: token, user: safeUser };
  }

  async passwordResetStart(
    dto: PasswordResetStartDto,
  ): Promise<{ otp_sent: boolean; role: string; email: string }> {
    const email = this.normalizeOtpEmail(dto.email);
    const account = await this.findElectricianByEmail(email);
    if (!account) throw new UnauthorizedException('Account not found for provided role and email');
    await this.sendOtp(email, { purpose: 'login' });
    return { otp_sent: true, role: dto.role, email };
  }

  async passwordResetComplete(
    dto: PasswordResetCompleteDto,
  ): Promise<{ updated: boolean; role: string }> {
    const email = this.normalizeOtpEmail(dto.email);
    const account = await this.findElectricianByEmail(email);
    if (!account) throw new UnauthorizedException('Account not found for provided role and email');
    await this.consumeOtp(email, dto.otp);
    const password_hash = await bcrypt.hash(String(dto.new_password || ''), 12);

    await this.dynamo.update(
      this.dynamo.tableName('electricians'),
      { id: String(account.id) },
      { password_hash, updated_at: new Date().toISOString() },
    );
    return { updated: true, role: dto.role };
  }

  async updateShopperGeo(userId: string, lat: number, lng: number): Promise<{ lat: number; lng: number; geo_captured_at: string }> {
    const user = await this.dynamo.get(this.dynamo.tableName('users'), { id: userId });
    if (!user) throw new NotFoundException('User not found');
    const role = String(user.role || '');
    if (role !== 'customer' && role !== 'dealer') {
      throw new BadRequestException('Only customers and dealers can update stored coordinates this way');
    }
    const la = Number(lat);
    const ln = Number(lng);
    if (Number.isNaN(la) || Number.isNaN(ln) || la < -90 || la > 90 || ln < -180 || ln > 180) {
      throw new BadRequestException('Invalid lat/lng');
    }
    const now = new Date().toISOString();
    await this.dynamo.update(this.dynamo.tableName('users'), { id: userId }, {
      lat: la,
      lng: ln,
      geo_captured_at: now,
      updated_at: now,
    });
    return { lat: la, lng: ln, geo_captured_at: now };
  }

  async updateDeviceToken(userId: string, fcmToken: string): Promise<{ updated: boolean }> {
    const token = String(fcmToken || '').trim();
    if (!token) {
      throw new BadRequestException('fcm_token is required');
    }
    await this.dynamo.update(
      this.dynamo.tableName('users'),
      { id: userId },
      { fcm_token: token, fcm_token_updated_at: new Date().toISOString() },
    );
    return { updated: true };
  }

  // ── Superadmin Login ──────────────────────────────────────────────────────
  async superadminLogin(dto: SuperadminLoginDto, clientIp: string): Promise<{ access_token: string }> {
    const sa = await this.dynamo.get(this.dynamo.tableName('superadmin'), { id: 'SUPERADMIN' });
    if (!sa) {
      throw new UnauthorizedException(
        'Superadmin is not configured. Set SUPERADMIN_EMAIL and SUPERADMIN_PASSWORD in backend .env, then run: npm run seed:superadmin',
      );
    }
    const rec = sa as Record<string, unknown>;
    const storedEmail = String(rec.email || '').trim().toLowerCase();
    const dtoEmail = String(dto.email || '').trim().toLowerCase();
    const hash = String(rec.password_hash || '');
    if (!storedEmail || !hash) {
      throw new UnauthorizedException(
        'Superadmin record is incomplete. Re-run: npm run seed:superadmin (after fixing .env)',
      );
    }
    const valid = await bcrypt.compare(dto.password, hash);
    if (!valid || storedEmail !== dtoEmail) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const sessionId = uuidv4();
    const ipNorm = normalizeClientIp(clientIp);
    const now = new Date().toISOString();
    await this.dynamo.update(
      this.dynamo.tableName('superadmin'),
      { id: 'SUPERADMIN' },
      {
        active_session_id: sessionId,
        active_session_ip: ipNorm,
        active_session_at: now,
      },
    );

    const emailOut = String(rec.email || '').trim();
    const token = this.jwt.sign({
      sub: 'SUPERADMIN',
      role: 'superadmin',
      email: emailOut,
      sa_sess: sessionId,
    });
    return { access_token: token };
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  /** Full profile for JWT holders (excludes password_hash). Used by GET /auth/me. */
  async getMeProfile(user: { id: string; role: string; email?: string; phone?: string }): Promise<Record<string, unknown>> {
    const strip = (row: Record<string, unknown>) => {
      const { password_hash: _p, ...rest } = row;
      return rest;
    };

    const role = String(user.role || '');
    if (role === 'customer' || role === 'dealer') {
      const u = await this.dynamo.get(this.dynamo.tableName('users'), { id: user.id });
      if (!u) throw new NotFoundException('User not found');
      const out = strip(u as Record<string, unknown>);
      if (role === 'dealer') {
        const gv = out.gst_verified;
        out.gst_verified =
          gv === true || gv === 'true' || gv === 1 || gv === '1';
      }
      return out;
    }
    if (role === 'electrician' || role === 'electrician_pending' || role === 'electrician_rejected') {
      const e = await this.dynamo.get(this.dynamo.tableName('electricians'), { id: user.id });
      if (!e) throw new NotFoundException('Profile not found');
      return strip(e as Record<string, unknown>);
    }
    if (role === 'superadmin') {
      const s = await this.dynamo.get(this.dynamo.tableName('superadmin'), { id: user.id });
      if (!s) throw new NotFoundException('Not found');
      const out = strip(s as Record<string, unknown>);
      delete out.active_session_id;
      delete out.active_session_ip;
      delete out.active_session_at;
      return out;
    }

    return {
      id: user.id,
      role,
      email: user.email ?? null,
      phone: user.phone ?? null,
    };
  }

  private signToken(id: string, role: string, email?: string, phone?: string): string {
    return this.jwt.sign({
      sub: id,
      role,
      email,
      phone,
    });
  }

  private async findUserByPhone(phone: string): Promise<any | null> {
    const items = await this.dynamo.query({
      TableName: this.dynamo.tableName('users'),
      IndexName: 'PhoneIndex',
      KeyConditionExpression: 'phone = :phone',
      ExpressionAttributeValues: { ':phone': phone },
      Limit: 1,
    });
    return items[0] || null;
  }

  private async findUserByEmail(email: string): Promise<any | null> {
    const norm = this.normalizeOtpEmail(email);
    const items = await this.dynamo.query({
      TableName: this.dynamo.tableName('users'),
      IndexName: 'EmailIndex',
      KeyConditionExpression: 'email = :email',
      ExpressionAttributeValues: { ':email': norm },
      Limit: 1,
    });
    if (items[0]) return items[0];
    return this.dynamo.findOneByEmailCaseInsensitive(this.dynamo.tableName('users'), norm);
  }

  private async findElectricianByEmail(email: string): Promise<any | null> {
    const norm = this.normalizeOtpEmail(email);
    const items = await this.dynamo.query({
      TableName: this.dynamo.tableName('electricians'),
      IndexName: 'EmailIndex',
      KeyConditionExpression: 'email = :email',
      ExpressionAttributeValues: { ':email': norm },
      Limit: 1,
    });
    if (items[0]) return items[0];
    return this.dynamo.findOneByEmailCaseInsensitive(this.dynamo.tableName('electricians'), norm);
  }

  private async findElectricianByPhone(phone: string): Promise<any | null> {
    const items = await this.dynamo.query({
      TableName: this.dynamo.tableName('electricians'),
      IndexName: 'PhoneIndex',
      KeyConditionExpression: 'phone = :phone',
      ExpressionAttributeValues: { ':phone': phone },
      Limit: 1,
    });
    return items[0] || null;
  }

  /** @param otpKey normalized email (stored under Dynamo attribute `phone` for legacy partition key). */
  private async consumeOtp(otpKey: string, otp: string): Promise<void> {
    const record = await this.dynamo.get(this.dynamo.tableName('otps'), { phone: otpKey });

    if (!record) throw new UnauthorizedException('OTP not found or expired');
    const stored = String(record.otp ?? '').replace(/\D/g, '');
    const given = String(otp ?? '').replace(/\D/g, '');
    if (stored.length !== 6 || given.length !== 6 || stored !== given) {
      throw new UnauthorizedException('Invalid OTP');
    }

    const nowSeconds = Math.floor(Date.now() / 1000);
    if (record.expires_at < nowSeconds) {
      await this.dynamo.delete(this.dynamo.tableName('otps'), { phone: otpKey });
      throw new UnauthorizedException('OTP has expired');
    }

    await this.dynamo.delete(this.dynamo.tableName('otps'), { phone: otpKey });
  }

  /** Used by technician self-registration: validate and delete OTP in one step with multipart submit. */
  async consumeRegistrationOtp(email: string, otp: string): Promise<void> {
    await this.consumeOtp(this.normalizeOtpEmail(email), otp);
  }

  async replaceAddressBook(
    userId: string,
    addresses: AddressBookEntryDto[],
  ): Promise<{ address_book: Record<string, unknown>[] }> {
    const user = await this.dynamo.get(this.dynamo.tableName('users'), { id: userId });
    if (!user) throw new NotFoundException('User not found');
    const role = String(user.role || '');
    if (role !== 'customer' && role !== 'dealer') {
      throw new BadRequestException('Only customers and dealers can update address book');
    }
    const now = new Date().toISOString();
    const hasDefault = addresses.some((a) => Boolean(a.is_default));
    const normalized: Record<string, unknown>[] = addresses.map((a, i) => ({
      id: a.id && String(a.id).length ? String(a.id) : uuidv4(),
      label: String(a.label || '').trim(),
      address: String(a.address || '').trim(),
      city: String(a.city || '').trim(),
      state: String(a.state || '').trim(),
      pincode: String(a.pincode || '').trim(),
      lat: a.lat != null && !Number.isNaN(Number(a.lat)) ? Number(a.lat) : undefined,
      lng: a.lng != null && !Number.isNaN(Number(a.lng)) ? Number(a.lng) : undefined,
      is_default: Boolean(a.is_default) || (!hasDefault && i === 0),
    }));
    const defaultIdx = normalized.findIndex((x) => Boolean(x.is_default));
    if (defaultIdx >= 0) {
      normalized.forEach((x, j) => {
        x.is_default = j === defaultIdx;
      });
    }
    await this.dynamo.update(this.dynamo.tableName('users'), { id: userId }, {
      address_book: normalized,
      updated_at: now,
    });
    return { address_book: normalized };
  }
}
