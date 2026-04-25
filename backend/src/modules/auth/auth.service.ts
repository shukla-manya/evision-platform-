import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { DynamoService } from '../../common/dynamo/dynamo.service';
import {
  RegisterDto,
  AdminLoginDto,
  SuperadminLoginDto,
  LoginOtpVerifyDto,
} from './dto/register.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private dynamo: DynamoService,
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

  // ── OTP ──────────────────────────────────────────────────────────────────
  async sendOtp(phone: string): Promise<{ message: string }> {
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
        body: `Your E Vision OTP is: ${otp}. Valid for 10 minutes.`,
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

  async verifyOtp(phone: string, otp: string): Promise<{ access_token: string; is_registered: boolean }> {
    await this.consumeOtp(phone, otp);

    // Check if user exists
    const existing = await this.findUserByPhone(phone);
    if (existing) {
      const token = this.signToken(existing.id, existing.role, existing.email, phone);
      return { access_token: token, is_registered: true };
    }

    // Issue a temporary token for registration
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

    const [existingPhone, existingEmail] = await Promise.all([
      this.findUserByPhone(dto.phone),
      this.findUserByEmail(dto.email),
    ]);

    if (existingPhone) throw new ConflictException('Phone number already registered');
    if (existingEmail) throw new ConflictException('Email already registered');

    const id = uuidv4();
    const user = {
      id,
      name: dto.name,
      phone: dto.phone,
      email: dto.email,
      role: dto.role,
      gst_no: dto.gst_no || null,
      fcm_token: null,
      address_book: dto.address ? [{ label: 'Home', address: dto.address, is_default: true }] : [],
      created_at: new Date().toISOString(),
    };

    await this.dynamo.put(this.dynamo.tableName('users'), user);

    const token = this.signToken(id, dto.role, dto.email, dto.phone);
    const { ...safeUser } = user;
    return { access_token: token, user: safeUser };
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

  // ── Admin Login (email + password) ────────────────────────────────────────
  async adminLogin(dto: AdminLoginDto): Promise<{ otp_sent: boolean; login_token: string }> {
    const admin = await this.findAdminByEmail(dto.email);
    if (!admin) throw new UnauthorizedException('Invalid credentials');
    if (admin.status !== 'approved') {
      throw new UnauthorizedException(
        admin.status === 'pending'
          ? 'Your account is awaiting superadmin approval'
          : 'Your account has been rejected',
      );
    }

    const valid = await bcrypt.compare(dto.password, admin.password_hash);
    if (!valid) throw new UnauthorizedException('Invalid credentials');
    if (!admin.phone) {
      throw new BadRequestException('Admin phone is missing; cannot complete OTP login');
    }
    await this.sendOtp(String(admin.phone));
    const login_token = this.jwt.sign(
      {
        sub: admin.id,
        role: 'admin',
        email: admin.email,
        phone: admin.phone,
        otp_login: 'admin',
      },
      { expiresIn: '10m' },
    );
    return { otp_sent: true, login_token };
  }

  async adminLoginVerify(dto: LoginOtpVerifyDto): Promise<{ access_token: string; admin: any }> {
    let payload: Record<string, unknown>;
    try {
      payload = this.jwt.verify<Record<string, unknown>>(dto.login_token);
    } catch {
      throw new UnauthorizedException('Invalid or expired login token');
    }
    if (payload.otp_login !== 'admin') throw new UnauthorizedException('Invalid login token');
    const phone = String(payload.phone || '');
    const adminId = String(payload.sub || '');
    if (!phone || !adminId) throw new UnauthorizedException('Invalid login token payload');
    await this.consumeOtp(phone, dto.otp);

    const admin = await this.dynamo.get(this.dynamo.tableName('admins'), { id: adminId });
    if (!admin) throw new UnauthorizedException('Admin not found');
    const token = this.signToken(admin.id, 'admin', admin.email);
    const { password_hash, ...safeAdmin } = admin;
    return { access_token: token, admin: safeAdmin };
  }

  // ── Superadmin Login ──────────────────────────────────────────────────────
  async superadminLogin(dto: SuperadminLoginDto): Promise<{ otp_sent: boolean; login_token: string }> {
    const sa = await this.dynamo.get(this.dynamo.tableName('superadmin'), { id: 'SUPERADMIN' });
    if (!sa) throw new UnauthorizedException('Superadmin not found');

    const valid = await bcrypt.compare(dto.password, sa.password_hash);
    if (!valid || sa.email !== dto.email) throw new UnauthorizedException('Invalid credentials');
    const saPhone = String(sa.phone || this.config.get<string>('SUPERADMIN_PHONE') || '');
    if (!saPhone) {
      throw new BadRequestException('Superadmin phone is missing; set SUPERADMIN_PHONE in env');
    }
    await this.sendOtp(saPhone);
    const login_token = this.jwt.sign(
      {
        sub: 'SUPERADMIN',
        role: 'superadmin',
        email: sa.email,
        phone: saPhone,
        otp_login: 'superadmin',
      },
      { expiresIn: '10m' },
    );
    return { otp_sent: true, login_token };
  }

  async superadminLoginVerify(dto: LoginOtpVerifyDto): Promise<{ access_token: string }> {
    let payload: Record<string, unknown>;
    try {
      payload = this.jwt.verify<Record<string, unknown>>(dto.login_token);
    } catch {
      throw new UnauthorizedException('Invalid or expired login token');
    }
    if (payload.otp_login !== 'superadmin') throw new UnauthorizedException('Invalid login token');
    const phone = String(payload.phone || '');
    if (!phone) throw new UnauthorizedException('Invalid login token payload');
    await this.consumeOtp(phone, dto.otp);

    const sa = await this.dynamo.get(this.dynamo.tableName('superadmin'), { id: 'SUPERADMIN' });
    if (!sa) throw new UnauthorizedException('Superadmin not found');
    const token = this.signToken('SUPERADMIN', 'superadmin', sa.email);
    return { access_token: token };
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
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

  private async consumeOtp(phone: string, otp: string): Promise<void> {
    const record = await this.dynamo.get(this.dynamo.tableName('otps'), { phone });

    if (!record) throw new UnauthorizedException('OTP not found or expired');
    if (record.otp !== otp) throw new UnauthorizedException('Invalid OTP');

    const nowSeconds = Math.floor(Date.now() / 1000);
    if (record.expires_at < nowSeconds) {
      await this.dynamo.delete(this.dynamo.tableName('otps'), { phone });
      throw new UnauthorizedException('OTP has expired');
    }

    await this.dynamo.delete(this.dynamo.tableName('otps'), { phone });
  }
}
