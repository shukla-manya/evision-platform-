import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DynamoService } from '../../common/dynamo/dynamo.service';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    private dynamo: DynamoService,
    private config: ConfigService,
  ) {}

  /**
   * Ensures a synthetic approved "shop" row exists so platform catalogue products can use `admin_id`.
   * Id must match `PLATFORM_CATALOG_ADMIN_ID` in env.
   */
  async ensurePlatformCatalogAdmin(platformId: string): Promise<void> {
    const id = platformId.trim();
    if (!id) return;
    const existing = await this.dynamo.get(this.dynamo.tableName('admins'), { id });
    if (existing) return;

    const shopName = this.config.get<string>('PLATFORM_SHOP_NAME')?.trim() || 'Evision India';
    const email = `platform-catalog-${id.slice(0, 8)}@internal.evision`;
    const admin = {
      id,
      shop_name: shopName,
      owner_name: 'Platform catalogue',
      email,
      phone: '+910000000001',
      gst_no: 'NA',
      address: 'Platform',
      city: 'Faridabad',
      pincode: '121002',
      logo_url: null,
      password_hash: null,
      status: 'approved',
      reject_reason: null,
      approved_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      platform_commission_pct: 0,
    };
    await this.dynamo.put(this.dynamo.tableName('admins'), admin);
    this.logger.log(`Seeded platform catalogue admin ${id} (${shopName})`);
  }
}
