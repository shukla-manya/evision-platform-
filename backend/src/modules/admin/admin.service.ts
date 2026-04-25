import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { DynamoService } from '../../common/dynamo/dynamo.service';
import { EmailService } from '../emails/email.service';
import { RegisterAdminDto } from './dto/register-admin.dto';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    private dynamo: DynamoService,
    private email: EmailService,
    private config: ConfigService,
  ) {}

  async register(dto: RegisterAdminDto): Promise<{ message: string }> {
    // Check duplicate email
    const existing = await this.findByEmail(dto.email);
    if (existing) throw new ConflictException('Email already registered');

    const id = uuidv4();
    const password_hash = await bcrypt.hash(dto.password, 12);

    const admin = {
      id,
      shop_name: dto.shop_name,
      owner_name: dto.owner_name,
      email: dto.email,
      phone: dto.phone,
      gst_no: dto.gst_no,
      address: dto.address,
      logo_url: dto.logo_url || null,
      password_hash,
      status: 'pending',
      reject_reason: null,
      created_at: new Date().toISOString(),
    };

    await this.dynamo.put(this.dynamo.tableName('admins'), admin);
    this.logger.log(`New admin registration: ${dto.shop_name} (${dto.email})`);

    // Notify superadmin
    const superadminEmail = this.config.get('SUPERADMIN_EMAIL');
    await this.email.sendAdminRegistered(superadminEmail, {
      shopName: dto.shop_name,
      ownerName: dto.owner_name,
      email: dto.email,
      phone: dto.phone,
    });

    return { message: 'Registration submitted. You will receive an email once approved.' };
  }

  async getById(id: string): Promise<any> {
    const admin = await this.dynamo.get(this.dynamo.tableName('admins'), { id });
    if (!admin) throw new NotFoundException('Admin not found');
    const { password_hash, ...safe } = admin;
    return safe;
  }

  async updateLogoUrl(adminId: string, logoUrl: string): Promise<{ logo_url: string }> {
    await this.getById(adminId);
    await this.dynamo.update(this.dynamo.tableName('admins'), { id: adminId }, { logo_url: logoUrl });
    return { logo_url: logoUrl };
  }

  async findByEmail(email: string): Promise<any | null> {
    const items = await this.dynamo.query({
      TableName: this.dynamo.tableName('admins'),
      IndexName: 'EmailIndex',
      KeyConditionExpression: 'email = :email',
      ExpressionAttributeValues: { ':email': email },
      Limit: 1,
    });
    return items[0] || null;
  }

  async getPendingAdmins(): Promise<any[]> {
    const items = await this.dynamo.query({
      TableName: this.dynamo.tableName('admins'),
      IndexName: 'StatusIndex',
      KeyConditionExpression: '#s = :status',
      ExpressionAttributeNames: { '#s': 'status' },
      ExpressionAttributeValues: { ':status': 'pending' },
    });
    return items.map(({ password_hash, ...a }) => a);
  }

  async getAllAdmins(): Promise<any[]> {
    const items = await this.dynamo.scan({ TableName: this.dynamo.tableName('admins') });
    return items.map(({ password_hash, ...a }) => a);
  }

  async approve(id: string): Promise<any> {
    const admin = await this.dynamo.get(this.dynamo.tableName('admins'), { id });
    if (!admin) throw new NotFoundException('Admin not found');
    if (admin.status !== 'pending') {
      throw new BadRequestException(`Admin is already ${admin.status}`);
    }

    await this.dynamo.update(this.dynamo.tableName('admins'), { id }, {
      status: 'approved',
      approved_at: new Date().toISOString(),
    });

    const loginUrl = `${this.config.get('FRONTEND_URL')}/admin/login`;
    await this.email.sendAdminApproved(admin.email, {
      ownerName: admin.owner_name,
      shopName: admin.shop_name,
      loginUrl,
    });

    this.logger.log(`Admin approved: ${admin.shop_name}`);
    return { message: 'Admin approved', admin_id: id };
  }

  async reject(id: string, reason: string): Promise<any> {
    const admin = await this.dynamo.get(this.dynamo.tableName('admins'), { id });
    if (!admin) throw new NotFoundException('Admin not found');

    await this.dynamo.update(this.dynamo.tableName('admins'), { id }, {
      status: 'rejected',
      reject_reason: reason || 'No reason provided',
      rejected_at: new Date().toISOString(),
    });

    await this.email.sendAdminRejected(admin.email, {
      ownerName: admin.owner_name,
      shopName: admin.shop_name,
      reason: reason || 'Your application did not meet our requirements.',
    });

    this.logger.log(`Admin rejected: ${admin.shop_name}`);
    return { message: 'Admin rejected', admin_id: id };
  }

  async suspend(id: string): Promise<any> {
    const admin = await this.dynamo.get(this.dynamo.tableName('admins'), { id });
    if (!admin) throw new NotFoundException('Admin not found');

    const newStatus = admin.status === 'suspended' ? 'approved' : 'suspended';
    await this.dynamo.update(this.dynamo.tableName('admins'), { id }, {
      status: newStatus,
      suspended_at: newStatus === 'suspended' ? new Date().toISOString() : null,
    });

    return { message: `Admin ${newStatus}`, admin_id: id };
  }

  async setPlatformCommission(id: string, pct: number): Promise<{ message: string; platform_commission_pct: number }> {
    if (pct < 0 || pct > 100 || Number.isNaN(pct)) {
      throw new BadRequestException('Platform commission must be between 0 and 100');
    }
    await this.getById(id);
    await this.dynamo.update(this.dynamo.tableName('admins'), { id }, { platform_commission_pct: pct });
    return { message: 'Commission updated', platform_commission_pct: pct };
  }

  async markSettlementComplete(id: string): Promise<{ message: string; last_settlement_at: string }> {
    await this.getById(id);
    const now = new Date().toISOString();
    await this.dynamo.update(this.dynamo.tableName('admins'), { id }, { last_settlement_at: now });
    return { message: 'Marked as settled', last_settlement_at: now };
  }
}
