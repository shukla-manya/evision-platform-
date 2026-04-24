import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { DynamoService } from '../../common/dynamo/dynamo.service';
import { S3Service } from '../../common/s3/s3.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ListProductsQueryDto } from './dto/list-products-query.dto';
import { CategoriesService } from '../categories/categories.service';
import { serializeProductForRole, serializeProductsForRole, PriceViewerRole } from './utils/product-serializer';

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);

  constructor(
    private dynamo: DynamoService,
    private s3: S3Service,
    private categories: CategoriesService,
  ) {}

  private productsTable() {
    return this.dynamo.tableName('products');
  }

  private adminsTable() {
    return this.dynamo.tableName('admins');
  }

  async assertApprovedAdmin(adminId: string): Promise<any> {
    const admin = await this.dynamo.get(this.adminsTable(), { id: adminId });
    if (!admin) throw new ForbiddenException('Admin not found');
    if (admin.status !== 'approved') {
      throw new ForbiddenException('Your shop must be approved before managing products');
    }
    return admin;
  }

  async create(adminId: string, dto: CreateProductDto, files?: Express.Multer.File[]): Promise<any> {
    await this.assertApprovedAdmin(adminId);
    await this.categories.requireCategory(dto.category_id);

    const uploadedUrls =
      files?.length > 0
        ? await Promise.all(
            files.map((f) => this.s3.upload(f.buffer, f.mimetype, 'products')),
          )
        : [];

    const images = [...(dto.images || []), ...uploadedUrls];
    const id = uuidv4();
    const now = new Date().toISOString();
    const item = {
      id,
      admin_id: adminId,
      name: dto.name.trim(),
      description: dto.description.trim(),
      price_customer: dto.price_customer,
      price_dealer: dto.price_dealer,
      stock: dto.stock,
      category_id: dto.category_id,
      brand: dto.brand?.trim() || null,
      active: dto.active !== false,
      images,
      low_stock_threshold: dto.low_stock_threshold ?? 10,
      created_at: now,
      updated_at: now,
    };

    await this.dynamo.put(this.productsTable(), item);
    this.logger.log(`Product created: ${item.name} (${id}) by admin ${adminId}`);
    return this.stripForAdminResponse(item);
  }

  async update(
    adminId: string,
    productId: string,
    dto: UpdateProductDto,
    files?: Express.Multer.File[],
  ): Promise<any> {
    await this.assertApprovedAdmin(adminId);
    const existing = await this.dynamo.get(this.productsTable(), { id: productId });
    if (!existing) throw new NotFoundException('Product not found');
    if (existing.admin_id !== adminId) {
      throw new ForbiddenException('You can only edit products for your own shop');
    }
    if (dto.category_id) await this.categories.requireCategory(dto.category_id);

    const uploadedUrls =
      files?.length > 0
        ? await Promise.all(
            files.map((f) => this.s3.upload(f.buffer, f.mimetype, 'products')),
          )
        : [];

    const updates: Record<string, any> = { updated_at: new Date().toISOString() };
    const assign = (k: string, v: any) => {
      if (v !== undefined) updates[k] = v;
    };

    assign('name', dto.name?.trim());
    assign('description', dto.description?.trim());
    assign('price_customer', dto.price_customer);
    assign('price_dealer', dto.price_dealer);
    assign('stock', dto.stock);
    assign('category_id', dto.category_id);
    assign('brand', dto.brand === undefined ? undefined : dto.brand?.trim() || null);
    assign('active', dto.active);
    assign('low_stock_threshold', dto.low_stock_threshold);

    if (dto.images !== undefined) {
      updates.images = [...dto.images, ...uploadedUrls];
    } else if (uploadedUrls.length) {
      updates.images = [...(existing.images || []), ...uploadedUrls];
    }

    const merged = await this.dynamo.update(this.productsTable(), { id: productId }, updates);
    return this.stripForAdminResponse(merged);
  }

  async remove(adminId: string, productId: string): Promise<void> {
    await this.assertApprovedAdmin(adminId);
    const existing = await this.dynamo.get(this.productsTable(), { id: productId });
    if (!existing) throw new NotFoundException('Product not found');
    if (existing.admin_id !== adminId) {
      throw new ForbiddenException('You can only delete products for your own shop');
    }
    await this.dynamo.delete(this.productsTable(), { id: productId });
    this.logger.log(`Product deleted: ${productId}`);
  }

  async listMine(adminId: string): Promise<any[]> {
    await this.assertApprovedAdmin(adminId);
    const items = await this.dynamo.query({
      TableName: this.productsTable(),
      IndexName: 'AdminIndex',
      KeyConditionExpression: 'admin_id = :aid',
      ExpressionAttributeValues: { ':aid': adminId },
    });
    return items
      .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
      .map((p) => this.withAdminFlags(p));
  }

  async findRawById(id: string): Promise<any | null> {
    return this.dynamo.get(this.productsTable(), { id });
  }

  async findByIdForRole(id: string, role: PriceViewerRole): Promise<any> {
    const p = await this.findRawById(id);
    if (!p) throw new NotFoundException('Product not found');
    if (!p.active && !['admin', 'superadmin'].includes(role)) {
      throw new NotFoundException('Product not found');
    }
    const enriched = await this.enrichShop([p]);
    const raw = enriched[0];
    const serialized = serializeProductForRole(raw, role);
    return this.withStockFlag(serialized, role, raw);
  }

  async listForRole(
    role: PriceViewerRole,
    query: ListProductsQueryDto,
  ): Promise<any[]> {
    const scan = await this.dynamo.scan({ TableName: this.productsTable() });
    let items = scan.filter((p) => p.active !== false);

    if (query.category_id) {
      items = items.filter((p) => p.category_id === query.category_id);
    }
    if (query.brand?.trim()) {
      const b = query.brand.trim().toLowerCase();
      items = items.filter((p) => (p.brand || '').toLowerCase().includes(b));
    }
    if (query.search?.trim()) {
      const q = query.search.trim().toLowerCase();
      items = items.filter((p) => (p.name || '').toLowerCase().includes(q));
    }

    const min = query.min_price;
    const max = query.max_price;
    if (min !== undefined || max !== undefined) {
      items = items.filter((p) => {
        const price =
          role === 'dealer'
            ? Number(p.price_dealer)
            : Number(p.price_customer);
        if (Number.isNaN(price)) return false;
        if (min !== undefined && price < min) return false;
        if (max !== undefined && price > max) return false;
        return true;
      });
    }

    const enriched = await this.enrichShop(items);
    const serialized = serializeProductsForRole(enriched, role);
    return serialized
      .map((p, i) => this.withStockFlag(p, role, enriched[i]))
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }

  private stripForAdminResponse(p: any) {
    const { price_customer, price_dealer, ...rest } = p;
    return {
      ...rest,
      price_customer: Number(price_customer),
      price_dealer: Number(price_dealer),
    };
  }

  private withAdminFlags(p: any) {
    const low = p.low_stock_threshold ?? 10;
    return {
      ...this.stripForAdminResponse(p),
      is_low_stock: Number(p.stock) <= low,
    };
  }

  private withStockFlag(serialized: any, role: PriceViewerRole, raw?: any) {
    const stock = raw?.stock ?? serialized.stock;
    const low = raw?.low_stock_threshold ?? serialized.low_stock_threshold ?? 10;
    const out = { ...serialized, stock: Number(stock) };
    if (role === 'admin' || role === 'superadmin') {
      out.is_low_stock = Number(stock) <= Number(low);
    }
    return out;
  }

  private async enrichShop(products: any[]): Promise<any[]> {
    if (!products.length) return products;
    const adminIds = [...new Set(products.map((p) => p.admin_id).filter(Boolean))];
    const admins = await Promise.all(
      adminIds.map((id) => this.dynamo.get(this.adminsTable(), { id })),
    );
    const map = new Map(admins.filter(Boolean).map((a: any) => [a.id, a]));
    return products.map((p) => {
      const a = map.get(p.admin_id);
      return {
        ...p,
        shop_name: a?.shop_name || null,
        shop_logo_url: a?.logo_url || null,
      };
    });
  }
}
