import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import { DynamoService } from '../../common/dynamo/dynamo.service';
import { S3Service } from '../../common/s3/s3.service';
import { CreateProductReviewDto } from './dto/create-product-review.dto';

@Injectable()
export class ProductReviewsService {
  constructor(
    private dynamo: DynamoService,
    private s3: S3Service,
    private config: ConfigService,
  ) {}

  private table() {
    return this.dynamo.tableName('product_reviews');
  }

  private productsTable() {
    return this.dynamo.tableName('products');
  }

  private usersTable() {
    return this.dynamo.tableName('users');
  }

  private platformCatalogAdminId(): string | undefined {
    return this.config.get<string>('PLATFORM_CATALOG_ADMIN_ID')?.trim() || undefined;
  }

  /** Public catalogue: same rule as product reads for guests. */
  private assertProductReviewable(product: Record<string, unknown>): void {
    const pid = this.platformCatalogAdminId();
    if (pid && String(product.admin_id) !== pid) {
      throw new NotFoundException('Product not found');
    }
    if (product.active === false) throw new NotFoundException('Product not found');
  }

  async summariesForProductIds(
    productIds: string[],
  ): Promise<Record<string, { rating_avg: number; rating_count: number }>> {
    const ids = [...new Set(productIds.filter(Boolean))];
    const out: Record<string, { rating_avg: number; rating_count: number }> = {};
    if (!ids.length) return out;
    const rows = await this.dynamo.scanAllPages({
      TableName: this.table(),
      FilterExpression: 'contains(:ids, product_id)',
      ExpressionAttributeValues: { ':ids': ids },
    });
    // Mongo adapter may not support contains on array — use simple scan + filter in JS
    const all = await this.dynamo.scanAllPages({ TableName: this.table() });
    const byProduct = new Map<string, number[]>();
    for (const r of all) {
      const pid = String((r as { product_id?: unknown }).product_id || '');
      if (!pid || !ids.includes(pid)) continue;
      const rt = Number((r as { rating?: unknown }).rating);
      if (Number.isNaN(rt) || rt < 1) continue;
      const list = byProduct.get(pid) || [];
      list.push(rt);
      byProduct.set(pid, list);
    }
    for (const pid of ids) {
      const list = byProduct.get(pid) || [];
      if (!list.length) continue;
      const sum = list.reduce((a, b) => a + b, 0);
      out[pid] = {
        rating_avg: Number((sum / list.length).toFixed(2)),
        rating_count: list.length,
      };
    }
    return out;
  }

  async listForProductPublic(productId: string): Promise<Record<string, unknown>[]> {
    const product = await this.dynamo.get(this.productsTable(), { id: productId });
    if (!product) throw new NotFoundException('Product not found');
    this.assertProductReviewable(product as Record<string, unknown>);

    const all = await this.dynamo.scanAllPages({ TableName: this.table() });
    const mine = all
      .filter((r) => String((r as { product_id?: unknown }).product_id) === productId)
      .sort(
        (a, b) =>
          new Date(String((b as { created_at?: unknown }).created_at || 0)).getTime() -
          new Date(String((a as { created_at?: unknown }).created_at || 0)).getTime(),
      );
    const customerIds = [...new Set(mine.map((r) => String((r as { customer_id?: unknown }).customer_id || '')).filter(Boolean))];
    const nameByCustomer = new Map<string, string>();
    await Promise.all(
      customerIds.map(async (cid) => {
        const u = await this.dynamo.get(this.usersTable(), { id: cid });
        if (u && (u as { name?: string }).name) {
          nameByCustomer.set(cid, String((u as { name?: string }).name));
        }
      }),
    );
    return mine.map((r) => ({
      ...r,
      customer_name: nameByCustomer.get(String((r as { customer_id?: unknown }).customer_id || '')) || 'Customer',
    }));
  }

  async createOrUpdate(
    userId: string,
    productId: string,
    dto: CreateProductReviewDto,
    photo?: Express.Multer.File,
  ): Promise<Record<string, unknown>> {
    const product = await this.dynamo.get(this.productsTable(), { id: productId });
    if (!product) throw new NotFoundException('Product not found');
    this.assertProductReviewable(product as Record<string, unknown>);

    let photoUrl: string | null = null;
    if (photo) {
      photoUrl = await this.s3.upload(photo.buffer, photo.mimetype, 'reviews');
    }

    const all = await this.dynamo.scanAllPages({ TableName: this.table() });
    const existing = all.find(
      (r) =>
        String((r as { product_id?: unknown }).product_id) === productId &&
        String((r as { customer_id?: unknown }).customer_id) === userId,
    ) as Record<string, unknown> | undefined;

    const now = new Date().toISOString();
    const id = existing?.id ? String(existing.id) : uuidv4();
    const prevPhoto = existing?.photo_url != null ? String(existing.photo_url) : null;
    const review = {
      id,
      product_id: productId,
      customer_id: userId,
      rating: Number(dto.rating),
      comment: dto.comment?.trim() || null,
      photo_url: photoUrl ?? (existing?.photo_url != null ? existing.photo_url : null),
      created_at: existing?.created_at || now,
      updated_at: now,
    };
    await this.dynamo.put(this.table(), review);

    if (photoUrl && prevPhoto && prevPhoto !== photoUrl) {
      await this.s3.delete(prevPhoto).catch(() => undefined);
    }

    const summary = await this.summariesForProductIds([productId]);
    const s = summary[productId];
    return {
      ...review,
      rating_avg: s?.rating_avg ?? Number(dto.rating),
      rating_count: s?.rating_count ?? 1,
    };
  }

  async listAllForSuperadmin(): Promise<Record<string, unknown>[]> {
    const rows = await this.dynamo.scanAllPages({ TableName: this.table() });
    const sorted = rows.sort(
      (a, b) =>
        new Date(String((b as { created_at?: unknown }).created_at || 0)).getTime() -
        new Date(String((a as { created_at?: unknown }).created_at || 0)).getTime(),
    );
    const out: Record<string, unknown>[] = [];
    for (const r of sorted) {
      const customer = await this.dynamo.get(this.usersTable(), { id: String((r as { customer_id?: unknown }).customer_id) });
      const product = await this.dynamo.get(this.productsTable(), { id: String((r as { product_id?: unknown }).product_id) });
      out.push({
        ...r,
        review_kind: 'product' as const,
        customer_name: customer?.name || customer?.email || 'Customer',
        product_name: (product as { name?: string } | null)?.name || 'Product',
      });
    }
    return out;
  }

  async deleteAsSuperadmin(reviewId: string): Promise<{ message: string }> {
    const review = await this.dynamo.get(this.table(), { id: reviewId });
    if (!review) throw new NotFoundException('Review not found');
    const url = (review as { photo_url?: string | null }).photo_url;
    await this.dynamo.delete(this.table(), { id: reviewId });
    if (url) await this.s3.delete(String(url)).catch(() => undefined);
    return { message: 'Review removed' };
  }
}
