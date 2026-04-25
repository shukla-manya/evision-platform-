import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { DynamoService } from '../../common/dynamo/dynamo.service';
import { ProductsService } from '../products/products.service';
import type { UserRole } from '../../common/decorators/roles.decorator';
import { AddToCartDto } from './dto/add-to-cart.dto';

@Injectable()
export class CartService {
  constructor(
    private dynamo: DynamoService,
    private products: ProductsService,
  ) {}

  private cartTable() {
    return this.dynamo.tableName('cart_items');
  }

  private adminsTable() {
    return this.dynamo.tableName('admins');
  }

  private priceForRole(product: Record<string, unknown>, role: UserRole): number {
    const raw = role === 'dealer' ? product.price_dealer : product.price_customer;
    const price = Number(raw);
    if (Number.isNaN(price) || price < 0) {
      throw new BadRequestException('Product price is invalid');
    }
    return price;
  }

  async listUserItems(userId: string): Promise<Record<string, unknown>[]> {
    const items = await this.dynamo.query({
      TableName: this.cartTable(),
      KeyConditionExpression: 'user_id = :uid',
      ExpressionAttributeValues: { ':uid': userId },
    });
    return items.sort(
      (a, b) =>
        new Date(String(b.created_at || 0)).getTime() -
        new Date(String(a.created_at || 0)).getTime(),
    );
  }

  async getGroupedCart(userId: string): Promise<Record<string, unknown>> {
    const items = await this.listUserItems(userId);
    if (!items.length) {
      return { shops: [], total_items: 0, grand_total: 0 };
    }

    const adminIds = [...new Set(items.map((i) => String(i.admin_id)).filter(Boolean))];
    const admins = await Promise.all(
      adminIds.map((id) => this.dynamo.get(this.adminsTable(), { id })),
    );
    const shopByAdminId = new Map(
      admins.filter(Boolean).map((a) => [String(a.id), String(a.shop_name || 'Shop')]),
    );

    const groups = new Map<
      string,
      {
        admin_id: string;
        shop_name: string;
        shop_total: number;
        items: Record<string, unknown>[];
      }
    >();

    let totalItems = 0;
    let grandTotal = 0;

    for (const item of items) {
      const adminId = String(item.admin_id || '');
      const quantity = Number(item.quantity || 1);
      const unitPrice = Number(item.price_at_time || 0);
      const lineTotal = unitPrice * quantity;

      totalItems += quantity;
      grandTotal += lineTotal;

      const decorated = {
        id: item.id,
        product_id: item.product_id,
        product_name: item.product_name,
        product_image_url: item.product_image_url ?? null,
        admin_id: item.admin_id,
        quantity,
        price_at_time: unitPrice,
        line_total: lineTotal,
        created_at: item.created_at,
      };

      const existing = groups.get(adminId);
      if (existing) {
        existing.shop_total += lineTotal;
        existing.items.push(decorated);
      } else {
        groups.set(adminId, {
          admin_id: adminId,
          shop_name: shopByAdminId.get(adminId) || 'Shop',
          shop_total: lineTotal,
          items: [decorated],
        });
      }
    }

    return {
      shops: Array.from(groups.values()),
      total_items: totalItems,
      grand_total: grandTotal,
      currency: 'INR',
    };
  }

  async add(userId: string, role: UserRole, dto: AddToCartDto): Promise<Record<string, unknown>> {
    const product = await this.products.findRawById(dto.product_id);
    if (!product) throw new NotFoundException('Product not found');
    if (product.active === false) throw new NotFoundException('Product not found');
    if (!product.admin_id) throw new BadRequestException('Product is missing shop information');

    const quantity = dto.quantity ?? 1;

    // If this product is already in the cart, increment quantity instead of adding a duplicate line.
    const existing = await this.dynamo.query({
      TableName: this.cartTable(),
      KeyConditionExpression: 'user_id = :uid',
      FilterExpression: 'product_id = :pid',
      ExpressionAttributeValues: { ':uid': userId, ':pid': dto.product_id },
    });
    if (existing.length > 0) {
      const row = existing[0];
      return this.dynamo.update(
        this.cartTable(),
        { user_id: userId, id: String(row.id) },
        { quantity: Number(row.quantity || 0) + quantity },
      );
    }

    const item = {
      user_id: userId,
      id: uuidv4(),
      product_id: dto.product_id,
      admin_id: String(product.admin_id),
      product_name: String(product.name || ''),
      product_image_url: Array.isArray(product.images) ? product.images[0] || null : null,
      quantity,
      price_at_time: this.priceForRole(product, role),
      created_at: new Date().toISOString(),
    };
    await this.dynamo.put(this.cartTable(), item);
    return item;
  }

  async remove(userId: string, itemId: string): Promise<void> {
    const row = await this.dynamo.get(this.cartTable(), { user_id: userId, id: itemId });
    if (!row) throw new NotFoundException('Cart item not found');
    await this.dynamo.delete(this.cartTable(), { user_id: userId, id: itemId });
  }
}
