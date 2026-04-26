import {
  Injectable,
  NotFoundException,
  ForbiddenException,
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

  private usersTable() {
    return this.dynamo.tableName('users');
  }

  private adminsTable() {
    return this.dynamo.tableName('admins');
  }

  /** Approved shops — used for indexed catalogue reads when no category filter is set. */
  private async listApprovedAdminIds(): Promise<string[]> {
    const rows = await this.dynamo.queryAllPages({
      TableName: this.adminsTable(),
      IndexName: 'StatusIndex',
      KeyConditionExpression: '#s = :st',
      ExpressionAttributeNames: { '#s': 'status' },
      ExpressionAttributeValues: { ':st': 'approved' },
    });
    return rows.map((r) => String((r as { id?: unknown }).id || '')).filter(Boolean);
  }

  private async mapChunkedParallel<T>(
    items: T[],
    chunkSize: number,
    fn: (t: T) => Promise<Record<string, unknown>[]>,
  ): Promise<Record<string, unknown>[][]> {
    const out: Record<string, unknown>[][] = [];
    for (let i = 0; i < items.length; i += chunkSize) {
      const chunk = items.slice(i, i + chunkSize);
      out.push(...(await Promise.all(chunk.map(fn))));
    }
    return out;
  }

  private mergeProductChunks(chunks: Record<string, unknown>[][]): Record<string, unknown>[] {
    const seen = new Set<string>();
    const merged: Record<string, unknown>[] = [];
    for (const chunk of chunks) {
      for (const p of chunk) {
        const id = String((p as { id?: unknown }).id || '');
        if (!id || seen.has(id)) continue;
        seen.add(id);
        merged.push(p);
      }
    }
    return merged;
  }

  /** Dealers without verified GST see customer catalog/cart pricing. */
  async effectivePriceRoleFromJwtUser(user?: { id?: string; role?: string } | null): Promise<PriceViewerRole> {
    if (!user?.role) return 'guest';
    const r = String(user.role) as PriceViewerRole;
    if (r !== 'dealer') return r;
    if (!user.id) return 'customer';
    const row = await this.dynamo.get(this.usersTable(), { id: user.id });
    if (!row) return 'customer';
    const gv = (row as Record<string, unknown>).gst_verified;
    if (gv === true || gv === 'true' || gv === 1 || gv === '1') return 'dealer';
    return 'customer';
  }

  /** Rewrites `images[]` and `shop_logo_url` to CloudFront when configured. */
  private applyCdnToProductPayload(p: Record<string, unknown>): void {
    const imgs = p.images;
    if (Array.isArray(imgs)) {
      p.images = this.s3.mapPublicImageUrls(imgs as string[]) ?? imgs;
    }
    const logo = p.shop_logo_url;
    if (typeof logo === 'string' && logo) {
      p.shop_logo_url = this.s3.rewriteToConfiguredCdn(logo) ?? logo;
    }
  }

  async assertApprovedAdmin(adminId: string): Promise<Record<string, unknown>> {
    const admin = await this.dynamo.get(this.adminsTable(), { id: adminId });
    if (!admin) throw new ForbiddenException('Admin not found');
    if (admin.status !== 'approved') {
      throw new ForbiddenException('Your shop must be approved before managing products');
    }
    return admin;
  }

  async create(adminId: string, dto: CreateProductDto, files?: Express.Multer.File[]): Promise<Record<string, unknown>> {
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
      min_order_quantity: dto.min_order_quantity ?? 1,
      mrp: dto.mrp ?? null,
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
  ): Promise<Record<string, unknown>> {
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

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    const assign = (k: string, v: unknown) => {
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
    assign('min_order_quantity', dto.min_order_quantity);
    assign('mrp', dto.mrp === undefined ? undefined : dto.mrp);

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

    const urls: string[] = Array.isArray(existing.images) ? existing.images : [];
    await Promise.all(
      urls.map((u) =>
        typeof u === 'string'
          ? this.s3.delete(u).catch((err) => this.logger.warn(`S3 delete failed for ${u}: ${err?.message}`))
          : Promise.resolve(),
      ),
    );

    await this.dynamo.delete(this.productsTable(), { id: productId });
    this.logger.log(`Product deleted: ${productId}`);
  }

  async listMine(adminId: string): Promise<Record<string, unknown>[]> {
    await this.assertApprovedAdmin(adminId);
    const items = await this.dynamo.query({
      TableName: this.productsTable(),
      IndexName: 'AdminIndex',
      KeyConditionExpression: 'admin_id = :aid',
      ExpressionAttributeValues: { ':aid': adminId },
    });
    const cats = await this.categories.listAll();
    const catNameById = new Map(cats.map((c: { id: string; name: string }) => [c.id, c.name]));
    return items
      .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
      .map((p) => ({
        ...this.withAdminFlags(p),
        category_name: catNameById.get(String(p.category_id)) || '—',
      }));
  }

  async getMineById(adminId: string, productId: string): Promise<Record<string, unknown>> {
    await this.assertApprovedAdmin(adminId);
    const p = await this.dynamo.get(this.productsTable(), { id: productId });
    if (!p || p.admin_id !== adminId) throw new NotFoundException('Product not found');
    return this.withAdminFlags(p);
  }

  async findRawById(id: string): Promise<Record<string, unknown> | null> {
    const row = await this.dynamo.get(this.productsTable(), { id });
    return row || null;
  }

  async findByIdForRole(id: string, role: PriceViewerRole): Promise<Record<string, unknown>> {
    const p = await this.findRawById(id);
    if (!p) throw new NotFoundException('Product not found');
    if (!p.active && !['admin', 'superadmin'].includes(role)) {
      throw new NotFoundException('Product not found');
    }
    const enriched = await this.enrichShop([p]);
    const raw = enriched[0] as Record<string, unknown>;
    const serialized = serializeProductForRole(raw, role) as Record<string, unknown>;
    this.applyCdnToProductPayload(serialized);
    return this.withStockFlag(serialized, role, raw);
  }

  async listForRole(
    role: PriceViewerRole,
    query: ListProductsQueryDto,
  ): Promise<Record<string, unknown>[]> {
    let items: Record<string, unknown>[] = [];

    if (query.category_id) {
      await this.categories.requireCategory(query.category_id);
      items = await this.dynamo.queryAllPages({
        TableName: this.productsTable(),
        IndexName: 'CategoryIndex',
        KeyConditionExpression: 'category_id = :cid',
        ExpressionAttributeValues: { ':cid': query.category_id },
      });
    } else {
      const cats = await this.categories.listAll();
      if (!cats.length) {
        const adminIds = await this.listApprovedAdminIds();
        if (!adminIds.length) {
          items = await this.dynamo.scanAllPages({ TableName: this.productsTable() });
        } else {
          const chunks = await this.mapChunkedParallel(adminIds, 12, (adminId) =>
            this.dynamo.queryAllPages({
              TableName: this.productsTable(),
              IndexName: 'AdminIndex',
              KeyConditionExpression: 'admin_id = :aid',
              ExpressionAttributeValues: { ':aid': adminId },
            }),
          );
          items = this.mergeProductChunks(chunks);
        }
      } else {
        const chunks = await this.mapChunkedParallel(cats as { id: string }[], 12, (c) =>
          this.dynamo.queryAllPages({
            TableName: this.productsTable(),
            IndexName: 'CategoryIndex',
            KeyConditionExpression: 'category_id = :cid',
            ExpressionAttributeValues: { ':cid': c.id },
          }),
        );
        items = this.mergeProductChunks(chunks);
      }
    }

    items = items.filter((p) => p.active !== false);

    if (query.brand?.trim()) {
      const b = query.brand.trim().toLowerCase();
      items = items.filter((p) => String(p.brand ?? '').toLowerCase().includes(b));
    }
    if (query.search?.trim()) {
      const q = query.search.trim().toLowerCase();
      items = items.filter((p) => String(p.name ?? '').toLowerCase().includes(q));
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

    let enriched = await this.enrichShop(items);
    const approvedOnly = query.approved_shops_only !== false;
    if (approvedOnly) {
      enriched = enriched.filter(
        (p) => String((p as Record<string, unknown>).shop_admin_status || '') === 'approved',
      );
    }
    enriched = enriched.map((p) => {
      const row = { ...(p as Record<string, unknown>) };
      delete row.shop_admin_status;
      return row as Record<string, unknown>;
    });
    const serialized = serializeProductsForRole(
      enriched as Record<string, unknown>[],
      role,
    ) as Record<string, unknown>[];
    return serialized
      .map((p, i) => {
        this.applyCdnToProductPayload(p);
        return this.withStockFlag(p, role, enriched[i] as Record<string, unknown>);
      })
      .sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
  }

  private stripForAdminResponse(p: Record<string, unknown>): Record<string, unknown> {
    const { price_customer, price_dealer, ...rest } = p;
    const out: Record<string, unknown> = {
      ...rest,
      price_customer: Number(price_customer),
      price_dealer: Number(price_dealer),
    };
    this.applyCdnToProductPayload(out);
    return out;
  }

  private withAdminFlags(p: Record<string, unknown>): Record<string, unknown> {
    const low = (p.low_stock_threshold as number) ?? 10;
    const base = this.stripForAdminResponse(p);
    return {
      ...base,
      is_low_stock: Number(p.stock) <= Number(low),
    };
  }

  private withStockFlag(
    serialized: Record<string, unknown>,
    role: PriceViewerRole,
    raw?: Record<string, unknown>,
  ): Record<string, unknown> {
    const stock = raw?.stock ?? serialized.stock;
    const low = raw?.low_stock_threshold ?? serialized.low_stock_threshold ?? 10;
    const out: Record<string, unknown> = { ...serialized, stock: Number(stock) };
    if (role === 'admin' || role === 'superadmin') {
      out.is_low_stock = Number(stock) <= Number(low);
    }
    return out;
  }

  private async enrichShop(products: Record<string, unknown>[]): Promise<Record<string, unknown>[]> {
    if (!products.length) return products;
    const adminIds = [...new Set(products.map((p) => p.admin_id).filter(Boolean))] as string[];
    const admins = await Promise.all(
      adminIds.map((id) => this.dynamo.get(this.adminsTable(), { id })),
    );
    const map = new Map(admins.filter(Boolean).map((a: Record<string, unknown>) => [a.id, a]));
    return products.map((p) => {
      const a = map.get(p.admin_id) as Record<string, unknown> | undefined;
      const shop_logo_url = typeof a?.logo_url === 'string' ? a.logo_url : null;
      const shop_admin_status = a ? String(a.status ?? '') : '';
      return {
        ...p,
        shop_name: a?.shop_name ?? null,
        shop_logo_url,
        shop_admin_status,
      };
    });
  }
}
