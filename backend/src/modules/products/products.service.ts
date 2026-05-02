import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import { DynamoService } from '../../common/dynamo/dynamo.service';
import { S3Service } from '../../common/s3/s3.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ListProductsQueryDto } from './dto/list-products-query.dto';
import { CategoriesService } from '../categories/categories.service';
import { ProductReviewsService } from '../reviews/product-reviews.service';
import { serializeProductForRole, serializeProductsForRole, PriceViewerRole } from './utils/product-serializer';

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);

  constructor(
    private dynamo: DynamoService,
    private s3: S3Service,
    private categories: CategoriesService,
    private config: ConfigService,
    private productReviews: ProductReviewsService,
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

  /** When set, storefront only lists this admin's products; shop picker only shows this row. */
  platformCatalogAdminId(): string | undefined {
    return this.config.get<string>('PLATFORM_CATALOG_ADMIN_ID')?.trim() || undefined;
  }

  /** Public directory: approved shop admins for storefront filters. */
  async listApprovedShopsPublic(): Promise<{ id: string; shop_name: string }[]> {
    const rows = await this.dynamo.queryAllPages({
      TableName: this.adminsTable(),
      IndexName: 'StatusIndex',
      KeyConditionExpression: '#s = :st',
      ExpressionAttributeNames: { '#s': 'status' },
      ExpressionAttributeValues: { ':st': 'approved' },
    });
    let list = rows
      .map((r) => ({
        id: String((r as { id?: unknown }).id || ''),
        shop_name: String((r as { shop_name?: unknown }).shop_name || 'Shop'),
      }))
      .filter((x) => x.id)
      .sort((a, b) => a.shop_name.localeCompare(b.shop_name, undefined, { sensitivity: 'base' }));
    const pid = this.platformCatalogAdminId();
    if (pid) list = list.filter((x) => x.id === pid);
    return list;
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
    const item: Record<string, unknown> = {
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
      amazon_url: dto.amazon_url?.trim() || null,
      created_at: now,
      updated_at: now,
    };
    if (dto.home_showcase_section === 'primary' || dto.home_showcase_section === 'combos') {
      item.home_showcase_section = dto.home_showcase_section;
      item.home_showcase_order = dto.home_showcase_order ?? 0;
      item.home_showcase_hot = dto.home_showcase_hot === true;
      if (dto.home_showcase_rating != null) {
        item.home_showcase_rating = dto.home_showcase_rating;
      }
    }

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
    const removeAttrs: string[] = [];
    const assign = (k: string, v: unknown) => {
      if (v !== undefined) updates[k] = v;
    };

    let clearingHomeShowcase = false;
    if (dto.home_showcase_section !== undefined) {
      if (dto.home_showcase_section === '') {
        clearingHomeShowcase = true;
        removeAttrs.push(
          'home_showcase_section',
          'home_showcase_order',
          'home_showcase_hot',
        );
      } else {
        updates.home_showcase_section = dto.home_showcase_section;
        if (dto.home_showcase_order !== undefined) {
          updates.home_showcase_order = Number(dto.home_showcase_order);
        } else {
          const ex = Number((existing as { home_showcase_order?: unknown }).home_showcase_order);
          updates.home_showcase_order = Number.isFinite(ex) ? ex : 0;
        }
      }
    } else if (dto.home_showcase_order !== undefined) {
      updates.home_showcase_order = Number(dto.home_showcase_order);
    }

    if (dto.home_showcase_hot !== undefined && !clearingHomeShowcase) {
      updates.home_showcase_hot = dto.home_showcase_hot;
    }

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
    assign(
      'amazon_url',
      dto.amazon_url === undefined ? undefined : dto.amazon_url === null ? null : dto.amazon_url?.trim() || null,
    );

    if (dto.images !== undefined) {
      updates.images = [...dto.images, ...uploadedUrls];
    } else if (uploadedUrls.length) {
      updates.images = [...(existing.images || []), ...uploadedUrls];
    }

    const merged = await this.dynamo.update(
      this.productsTable(),
      { id: productId },
      updates,
      removeAttrs.length ? [...new Set(removeAttrs)] : undefined,
    );
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

  /** Block cart/checkout for non-platform products when catalogue is restricted. */
  assertProductInPlatformCatalog(product: Record<string, unknown>, role: string): void {
    const pid = this.platformCatalogAdminId();
    const r = String(role);
    if (pid && (r === 'customer' || r === 'dealer') && String(product.admin_id) !== pid) {
      throw new NotFoundException('Product not found');
    }
  }

  async findByIdForRole(id: string, role: PriceViewerRole): Promise<Record<string, unknown>> {
    const p = await this.findRawById(id);
    if (!p) throw new NotFoundException('Product not found');
    const pid = this.platformCatalogAdminId();
    if (pid && (role === 'guest' || role === 'customer' || role === 'dealer') && String(p.admin_id) !== pid) {
      throw new NotFoundException('Product not found');
    }
    if (!p.active && role !== 'superadmin') {
      throw new NotFoundException('Product not found');
    }
    const enriched = await this.enrichShop([p]);
    const raw = enriched[0] as Record<string, unknown>;
    const serialized = serializeProductForRole(raw, role) as Record<string, unknown>;
    this.applyCdnToProductPayload(serialized);
    const withStock = this.withStockFlag(serialized, role, raw);
    const cats = await this.categories.listAll();
    const catNameById = new Map(cats.map((c: { id: string; name: string }) => [c.id, c.name]));
    const category_name = catNameById.get(String(withStock.category_id || '')) || null;
    const sums = await this.productReviews.summariesForProductIds([id]);
    const s = sums[id];
    const ratingBlock =
      s && s.rating_count > 0 ? { rating_avg: s.rating_avg, rating_count: s.rating_count } : {};
    return { ...withStock, category_name, ...ratingBlock };
  }

  /**
   * Homepage showcase — platform catalogue products where superadmin set
   * `home_showcase_section`. Guest-visible prices and no internal editorial keys.
   */
  async listHomeShowcaseForPublic(): Promise<{
    primary: Record<string, unknown>[];
    combos: Record<string, unknown>[];
  }> {
    const pid = this.platformCatalogAdminId();
    if (!pid) return { primary: [], combos: [] };

    const items = await this.dynamo.queryAllPages({
      TableName: this.productsTable(),
      IndexName: 'AdminIndex',
      KeyConditionExpression: 'admin_id = :aid',
      ExpressionAttributeValues: { ':aid': pid },
    });

    const candidates = items.filter(
      (p) =>
        p.active !== false &&
        (p.home_showcase_section === 'primary' || p.home_showcase_section === 'combos'),
    );

    const role: PriceViewerRole = 'guest';
    const enriched = await this.enrichShop(candidates);
    const approved = enriched.filter(
      (p) => String((p as Record<string, unknown>).shop_admin_status || '') === 'approved',
    );

    const cleaned = approved.map((p) => {
      const row = { ...(p as Record<string, unknown>) };
      delete row.shop_admin_status;
      return row;
    });

    const serialized = serializeProductsForRole(cleaned, role) as Record<string, unknown>[];
    const cats = await this.categories.listAll();
    const catNameById = new Map(cats.map((c: { id: string; name: string }) => [c.id, c.name]));
    const showcaseIds = cleaned.map((x) => String((x as Record<string, unknown>).id || '')).filter(Boolean);
    const ratingSums = await this.productReviews.summariesForProductIds(showcaseIds);

    const rows: { section: string; order: number; payload: Record<string, unknown> }[] = [];
    for (let i = 0; i < serialized.length; i++) {
      const raw = cleaned[i] as Record<string, unknown>;
      const p = serialized[i];
      this.applyCdnToProductPayload(p);
      const withStock = this.withStockFlag(p, role, raw);
      const category_name = catNameById.get(String(withStock.category_id || '')) || null;
      const showcase_hot = raw.home_showcase_hot === true;
      const pid = String(raw.id || '');
      const s = ratingSums[pid];
      const listing_rating = s && s.rating_count > 0 ? s.rating_avg : null;
      const listing_review_count = s?.rating_count ?? 0;
      const base = {
        ...withStock,
        category_name,
        listing_rating,
        listing_review_count,
        showcase_hot,
      } as Record<string, unknown>;
      delete base.home_showcase_section;
      delete base.home_showcase_order;
      delete base.home_showcase_hot;
      delete base.home_showcase_rating;
      rows.push({
        section: String(raw.home_showcase_section),
        order: Number(raw.home_showcase_order ?? 0),
        payload: base,
      });
    }

    const sortFn = (a: (typeof rows)[0], b: (typeof rows)[0]) =>
      a.order - b.order || String(a.payload.name || '').localeCompare(String(b.payload.name || ''));

    const primary = rows.filter((r) => r.section === 'primary').sort(sortFn).map((r) => r.payload);
    const combos = rows.filter((r) => r.section === 'combos').sort(sortFn).map((r) => r.payload);

    return {
      primary: primary.slice(0, 6),
      combos: combos.slice(0, 2),
    };
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

    const pid = this.platformCatalogAdminId();
    if (pid && (role === 'guest' || role === 'customer' || role === 'dealer')) {
      items = items.filter((p) => String(p.admin_id) === pid);
    }

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
    const cats = await this.categories.listAll();
    const catNameById = new Map(cats.map((c: { id: string; name: string }) => [c.id, c.name]));
    const withCategories: Record<string, unknown>[] = serialized.map((p, i) => {
      this.applyCdnToProductPayload(p);
      const row = this.withStockFlag(p, role, enriched[i] as Record<string, unknown>);
      const category_name = catNameById.get(String(row.category_id || '')) || null;
      return { ...row, category_name };
    });
    const listIds = withCategories.map((x) => String(x.id || '')).filter(Boolean);
    const sums = await this.productReviews.summariesForProductIds(listIds);
    const withRatings = withCategories.map((row) => {
      const s = sums[String(row.id || '')];
      if (s && s.rating_count > 0) {
        return { ...row, rating_avg: s.rating_avg, rating_count: s.rating_count };
      }
      return row;
    });
    return withRatings.sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
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
    if (role === 'superadmin') {
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
