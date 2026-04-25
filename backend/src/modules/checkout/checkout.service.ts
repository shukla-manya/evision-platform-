import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import Razorpay from 'razorpay';
import { DynamoService } from '../../common/dynamo/dynamo.service';
import { CartService } from '../cart/cart.service';

@Injectable()
export class CheckoutService {
  private razorpayClient: Razorpay | null = null;

  constructor(
    private dynamo: DynamoService,
    private config: ConfigService,
    private cart: CartService,
  ) {}

  private orderGroupsTable() {
    return this.dynamo.tableName('order_groups');
  }

  private ordersTable() {
    return this.dynamo.tableName('orders');
  }

  private orderItemsTable() {
    return this.dynamo.tableName('order_items');
  }

  private razorpay(): Razorpay {
    if (this.razorpayClient) return this.razorpayClient;
    const keyId = this.config.get<string>('RAZORPAY_KEY_ID');
    const keySecret = this.config.get<string>('RAZORPAY_KEY_SECRET');
    if (!keyId || !keySecret) {
      throw new BadRequestException(
        'Razorpay is not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET',
      );
    }
    this.razorpayClient = new Razorpay({ key_id: keyId, key_secret: keySecret });
    return this.razorpayClient;
  }

  async createOrder(userId: string): Promise<Record<string, unknown>> {
    const cartItems = await this.cart.listUserItems(userId);
    if (!cartItems.length) throw new BadRequestException('Cart is empty');

    const now = new Date().toISOString();
    const groupId = uuidv4();

    const grouped = new Map<
      string,
      {
        admin_id: string;
        items: Record<string, unknown>[];
        total: number;
      }
    >();

    let total = 0;
    for (const item of cartItems) {
      const adminId = String(item.admin_id || '');
      if (!adminId) throw new BadRequestException('Cart item is missing admin_id');
      const quantity = Number(item.quantity || 1);
      const unitPrice = Number(item.price_at_time || 0);
      const lineTotal = quantity * unitPrice;
      if (Number.isNaN(lineTotal) || lineTotal <= 0) {
        throw new BadRequestException('Invalid cart item amount');
      }
      total += lineTotal;

      const existing = grouped.get(adminId);
      if (existing) {
        existing.total += lineTotal;
        existing.items.push(item);
      } else {
        grouped.set(adminId, {
          admin_id: adminId,
          total: lineTotal,
          items: [item],
        });
      }
    }

    const amountPaise = Math.round(total * 100);
    if (amountPaise <= 0) {
      throw new BadRequestException('Total amount must be greater than zero');
    }

    const rpOrder = await this.razorpay().orders.create({
      amount: amountPaise,
      currency: 'INR',
      receipt: `grp_${groupId.slice(0, 18)}`,
      notes: {
        user_id: userId,
        order_group_id: groupId,
      },
    });

    await this.dynamo.put(this.orderGroupsTable(), {
      id: groupId,
      user_id: userId,
      total_amount: total,
      currency: 'INR',
      status: 'payment_pending',
      razorpay_order_id: rpOrder.id,
      created_at: now,
      updated_at: now,
    });

    for (const [adminId, data] of grouped.entries()) {
      const orderId = uuidv4();
      await this.dynamo.put(this.ordersTable(), {
        id: orderId,
        group_id: groupId,
        user_id: userId,
        admin_id: adminId,
        total_amount: data.total,
        currency: 'INR',
        status: 'payment_pending',
        created_at: now,
        updated_at: now,
      });

      await Promise.all(
        data.items.map((item) =>
          this.dynamo.put(this.orderItemsTable(), {
            order_id: orderId,
            id: uuidv4(),
            product_id: item.product_id,
            product_name: item.product_name,
            quantity: Number(item.quantity || 1),
            unit_price: Number(item.price_at_time || 0),
            line_total:
              Number(item.price_at_time || 0) * Number(item.quantity || 1),
            admin_id: item.admin_id,
            cart_item_id: item.id,
            created_at: now,
          }),
        ),
      );
    }

    return {
      razorpay_order_id: rpOrder.id,
      amount: total,
      amount_paise: amountPaise,
      currency: 'INR',
      order_group_id: groupId,
      key_id: this.config.get<string>('RAZORPAY_KEY_ID'),
    };
  }
}
