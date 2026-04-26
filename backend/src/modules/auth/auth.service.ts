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
import {
  RegisterDto,
  AdminLoginDto,
  SuperadminLoginDto,
  PasswordResetStartDto,
  PasswordResetCompleteDto,
} from './dto/register.dto';
import { AdminSetupPasswordDto } from './dto/admin-setup-password.dto';
import type { AddressBookEntryDto } from './dto/update-address-book.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private dynamo: DynamoService,
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

  // ── OTP ──────────────────────────────────────────────────────────────────
  async sendOtp(
    phone: string,
    opts?: { purpose?: 'login' | 'signup'; email?: string },
  ): Promise<{ message: string }> {
    const purpose = opts?.purpose ?? 'login';
    if (purpose === 'signup') {
      const emailNorm = String(opts?.email || '').trim().toLowerCase();
      if (!emailNorm) {
        throw new BadRequestException('Email is required when requesting signup OTP');
      }
      const [existingPhone, existingEmailUser, ecPhone, ecEmail] = await Promise.all([
        this.findUserByPhone(phone),
        this.findUserByEmail(emailNorm),
        this.findElectricianByPhone(phone),
        this.findElectricianByEmail(emailNorm),
      ]);
      if (existingPhone) {
        throw new ConflictException('This phone number is already registered. Sign in instead.');
      }
      if (ecPhone) {
        throw new ConflictException('This phone number is already used for a technician account.');
      }
      if (existingEmailUser) {
        throw new ConflictException('Email already registered');
      }
      if (ecEmail) {
        throw new ConflictException('Email already registered for a technician account');
      }
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Math.floor(Date.now() / 1000) + 600; // 10 min TTL

    await this.dynamo.put(this.dynamo.tableName('otps'), {
      phone,
      otp,
      expires_at: expiresAt,
    });

    const raw = this.config.get<string>('OTP_CONSOLE_ONLY');
    const consoleOnly =
      raw === undefined ||
      raw === '' ||
      raw === '1' ||
      raw.toLowerCase() === 'true';

    if (consoleOnly) {
      this.logger.log(`[OTP] ${phone} → ${otp} (valid 10 minutes)`);
      return { message: 'OTP sent successfully' };
    }

    try {
      const twilio = require('twilio')(
        this.config.get('TWILIO_ACCOUNT_SID'),
        this.config.get('TWILIO_AUTH_TOKEN'),
      );
      await twilio.messages.create({
        body: `Your E vision OTP is: ${otp}. Valid for 10 minutes.`,
        from: this.config.get('TWILIO_PHONE_NUMBER'),
        to: phone,
      });
      this.logger.log(`OTP sent to ${phone}`);
    } catch (err: any) {
      this.logger.warn(`Twilio send failed for ${phone}: ${err?.message ?? err}`);
      if (this.config.get('NODE_ENV') !== 'production') {
        this.logger.log(`[OTP] ${phone} → ${otp} (fallback after Twilio failure)`);
      }
    }

    return { message: 'OTP sent successfully' };
  }

  async verifyOtp(
    phone: string,
    otp: string,
  ): Promise<{
    access_token: string;
    is_registered: boolean;
    electrician_status?: 'pending' | 'rejected';
  }> {
    await this.consumeOtp(phone, otp);

    const existing = await this.findUserByPhone(phone);
    if (existing) {
      const token = this.signToken(existing.id, existing.role, existing.email, phone);
      return { access_token: token, is_registered: true };
    }

    const electrician = await this.findElectricianByPhone(phone);
    if (electrician) {
      const st = String(electrician.status || '').toLowerCase();
      if (st === 'approved') {
        const token = this.signToken(
          String(electrician.id),
          'electrician',
          String(electrician.email || ''),
          phone,
        );
        return { access_token: token, is_registered: true };
      }
      if (st === 'pending') {
        const token = this.signToken(
          String(electrician.id),
          'electrician_pending',
          String(electrician.email || ''),
          phone,
        );
        return { access_token: token, is_registered: true, electrician_status: 'pending' as const };
      }
      if (st === 'rejected') {
        const token = this.signToken(
          String(electrician.id),
          'electrician_rejected',
          String(electrician.email || ''),
          phone,
        );
        return { access_token: token, is_registered: true, electrician_status: 'rejected' as const };
      }
      throw new UnauthorizedException('Technician account is not available for sign-in.');
    }

    const tempToken = this.jwt.sign(
      { sub: `temp_${phone}`, role: 'unregistered', phone },
      { expiresIn: '15m' },
    );
    return { access_token: tempToken, is_registered: false };
  }

  // ── Registration ──────────────────────────────────────────────────────────
  async register(dto: RegisterDto): Promise<{ access_token: string; user: any }> {
    await this.consumeOtp(dto.phone, dto.otp);
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

    const emailNorm = String(dto.email || '').trim().toLowerCase();
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
  ): Promise<{ otp_sent: boolean; role: string; phone: string }> {
    const normalizedRole = dto.role;
    const phone = String(dto.phone || '').trim();
    const account = await this.findAccountByRoleAndPhone(normalizedRole, phone);
    if (!account) throw new UnauthorizedException('Account not found for provided role and phone');
    await this.sendOtp(phone);
    return { otp_sent: true, role: normalizedRole, phone };
  }

  async passwordResetComplete(
    dto: PasswordResetCompleteDto,
  ): Promise<{ updated: boolean; role: string }> {
    const normalizedRole = dto.role;
    const phone = String(dto.phone || '').trim();
    const account = await this.findAccountByRoleAndPhone(normalizedRole, phone);
    if (!account) throw new UnauthorizedException('Account not found for provided role and phone');
    await this.consumeOtp(phone, dto.otp);
    const password_hash = await bcrypt.hash(String(dto.new_password || ''), 12);

    if (normalizedRole === 'admin') {
      await this.dynamo.update(
        this.dynamo.tableName('admins'),
        { id: String(account.id) },
        { password_hash, updated_at: new Date().toISOString() },
      );
      return { updated: true, role: normalizedRole };
    }
    await this.dynamo.update(
      this.dynamo.tableName('electricians'),
      { id: String(account.id) },
      { password_hash, updated_at: new Date().toISOString() },
    );
    return { updated: true, role: normalizedRole };
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

  // ── Admin Login (email + password) — approved shops only, after password created from approval email ──
  async adminLogin(dto: AdminLoginDto): Promise<{ access_token: string; admin: any }> {
    const admin = await this.findAdminByEmail(dto.email);
    if (!admin) throw new UnauthorizedException('Invalid credentials');

    const st = String(admin.status || '').toLowerCase();
    if (st === 'pending') {
      throw new UnauthorizedException(
        'Your shop registration is still under review. You will receive an email when it is approved.',
      );
    }
    if (st === 'rejected') {
      throw new UnauthorizedException('Your shop registration was not approved.');
    }
    if (st === 'suspended') {
      throw new UnauthorizedException('Your shop account has been suspended.');
    }
    if (st !== 'approved') {
      throw new UnauthorizedException('Your account is not available for sign-in.');
    }

    const ph = String(admin.password_hash || '');
    if (!ph) {
      throw new UnauthorizedException(
        'You have not created a password yet. Open the link in your approval email to set your password, then sign in here.',
      );
    }

    const valid = await bcrypt.compare(dto.password, ph);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    const token = this.signToken(String(admin.id), 'admin', String(admin.email || ''), String(admin.phone || ''));
    const { password_hash, ...safeAdmin } = admin;
    return { access_token: token, admin: safeAdmin };
  }

  /** One-time password creation after superadmin approval (JWT from email). */
  async adminSetupPasswordFromInvite(dto: AdminSetupPasswordDto): Promise<{ message: string }> {
    let payload: { sub?: string; purpose?: string };
    try {
      payload = this.jwt.verify<{ sub?: string; purpose?: string }>(dto.token);
    } catch {
      throw new UnauthorizedException('Invalid or expired setup link');
    }
    if (payload.purpose !== 'admin_password_setup' || !payload.sub) {
      throw new UnauthorizedException('Invalid setup link');
    }

    const admin = await this.dynamo.get(this.dynamo.tableName('admins'), { id: payload.sub });
    if (!admin) throw new NotFoundException('Admin not found');
    if (String(admin.status || '') !== 'approved') {
      throw new BadRequestException('Your shop must be approved before you can set a password.');
    }
    const existing = String(admin.password_hash || '');
    if (existing.length > 0) {
      throw new BadRequestException(
        'A password is already set for this account. Sign in with your email and password, or reset it with the phone OTP flow.',
      );
    }

    const password_hash = await bcrypt.hash(dto.new_password, 12);
    const now = new Date().toISOString();
    await this.dynamo.update(this.dynamo.tableName('admins'), { id: payload.sub }, {
      password_hash,
      password_set_at: now,
      updated_at: now,
    });
    return {
      message: 'Your password has been created. You can now sign in with your email and password.',
    };
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
      return strip(u as Record<string, unknown>);
    }
    if (role === 'electrician' || role === 'electrician_pending' || role === 'electrician_rejected') {
      const e = await this.dynamo.get(this.dynamo.tableName('electricians'), { id: user.id });
      if (!e) throw new NotFoundException('Profile not found');
      return strip(e as Record<string, unknown>);
    }
    if (role === 'admin') {
      const a = await this.dynamo.get(this.dynamo.tableName('admins'), { id: user.id });
      if (!a) throw new NotFoundException('Admin not found');
      return strip(a as Record<string, unknown>);
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
    const items = await this.dynamo.query({
      TableName: this.dynamo.tableName('users'),
      IndexName: 'EmailIndex',
      KeyConditionExpression: 'email = :email',
      ExpressionAttributeValues: { ':email': email },
      Limit: 1,
    });
    return items[0] || null;
  }

  private async findElectricianByEmail(email: string): Promise<any | null> {
    const items = await this.dynamo.query({
      TableName: this.dynamo.tableName('electricians'),
      IndexName: 'EmailIndex',
      KeyConditionExpression: 'email = :email',
      ExpressionAttributeValues: { ':email': email },
      Limit: 1,
    });
    return items[0] || null;
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

  async findAdminByEmail(email: string): Promise<any | null> {
    const items = await this.dynamo.query({
      TableName: this.dynamo.tableName('admins'),
      IndexName: 'EmailIndex',
      KeyConditionExpression: 'email = :email',
      ExpressionAttributeValues: { ':email': email },
      Limit: 1,
    });
    return items[0] || null;
  }

  private async findAdminByPhone(phone: string): Promise<any | null> {
    const items = await this.dynamo.scan({
      TableName: this.dynamo.tableName('admins'),
      FilterExpression: 'phone = :phone',
      ExpressionAttributeValues: { ':phone': phone },
    });
    return items[0] || null;
  }

  private async findAccountByRoleAndPhone(
    role: 'electrician' | 'admin',
    phone: string,
  ): Promise<any | null> {
    if (role === 'admin') return this.findAdminByPhone(phone);
    return this.findElectricianByPhone(phone);
  }

  private async consumeOtp(phone: string, otp: string): Promise<void> {
    const record = await this.dynamo.get(this.dynamo.tableName('otps'), { phone });

    if (!record) throw new UnauthorizedException('OTP not found or expired');
    const stored = String(record.otp ?? '').replace(/\D/g, '');
    const given = String(otp ?? '').replace(/\D/g, '');
    if (stored.length !== 6 || given.length !== 6 || stored !== given) {
      throw new UnauthorizedException('Invalid OTP');
    }

    const nowSeconds = Math.floor(Date.now() / 1000);
    if (record.expires_at < nowSeconds) {
      await this.dynamo.delete(this.dynamo.tableName('otps'), { phone });
      throw new UnauthorizedException('OTP has expired');
    }

    await this.dynamo.delete(this.dynamo.tableName('otps'), { phone });
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
