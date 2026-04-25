import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import Razorpay from 'razorpay';
import { createHmac } from 'crypto';
import { DynamoService } from '../../common/dynamo/dynamo.service';
import { CartService } from '../cart/cart.service';
import { EmailService } from '../emails/email.service';

@Injectable()
export class CheckoutService {
  private readonly logger = new Logger(CheckoutService.name);
  private razorpayClient: Razorpay | null = null;

  constructor(
    private dynamo: DynamoService,
    private config: ConfigService,
    private cart: CartService,
    private email: EmailService,
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

  private usersTable() {
    return this.dynamo.tableName('users');
  }

  private adminsTable() {
    return this.dynamo.tableName('admins');
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
    }

    const amountPaise = Math.round(total * 100);
    if (amountPaise <= 0) {
      throw new BadRequestException('Total amount must be greater than zero');
    }

    const rpOrder = await this.razorpay().orders.create({
      amount: amountPaise,
      currency: 'INR',
      receipt: `chk_${uuidv4().slice(0, 18)}`,
      notes: {
        user_id: userId,
      },
    });

    return {
      razorpay_order_id: rpOrder.id,
      amount: total,
      amount_paise: amountPaise,
      currency: 'INR',
      key_id: this.config.get<string>('RAZORPAY_KEY_ID'),
    };
  }

  private verifyWebhookSignature(rawBody: Buffer, signature: string): void {
    const secret = this.config.get<string>('RAZORPAY_WEBHOOK_SECRET');
    if (!secret) {
      throw new BadRequestException('RAZORPAY_WEBHOOK_SECRET is not configured');
    }
    const expected = createHmac('sha256', secret)
      .update(rawBody)
      .digest('hex');
    if (expected !== signature) {
      throw new BadRequestException('Invalid Razorpay webhook signature');
    }
  }

  async processWebhook(rawBody: Buffer, signature: string, payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    this.verifyWebhookSignature(rawBody, signature);
    const event = String(payload.event || '');
    if (event === 'payment.captured') {
      return this.handlePaymentCaptured(payload);
    }
    if (event === 'payment.failed') {
      return this.handlePaymentFailed(payload);
    }
    return { ok: true, ignored: true, event };
  }

  private async findOrderGroupByRazorpayOrderId(orderId: string): Promise<Record<string, unknown> | null> {
    const groups = await this.dynamo.scan({
      TableName: this.orderGroupsTable(),
      FilterExpression: 'razorpay_order_id = :roid',
      ExpressionAttributeValues: { ':roid': orderId },
    });
    return groups[0] || null;
  }

  private async handlePaymentCaptured(payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    const payment = (((payload.payload as Record<string, unknown>)?.payment as Record<string, unknown>)?.entity ||
      {}) as Record<string, unknown>;
    const razorpayOrderId = String(payment.order_id || '');
    const razorpayPaymentId = String(payment.id || '');
    const userId = String((payment.notes as Record<string, unknown> | undefined)?.user_id || '');
    if (!razorpayOrderId || !userId) {
      throw new BadRequestException('Invalid payment payload');
    }

    const existing = await this.findOrderGroupByRazorpayOrderId(razorpayOrderId);
    if (existing) {
      return { ok: true, duplicate: true, order_group_id: existing.id };
    }

    const cartItems = await this.cart.listUserItems(userId);
    if (!cartItems.length) {
      throw new BadRequestException('Cart is empty for this user; cannot materialize order');
    }

    const now = new Date().toISOString();
    const groupId = uuidv4();
    const grouped = new Map<string, { total: number; items: Record<string, unknown>[] }>();
    let total = 0;

    for (const item of cartItems) {
      const adminId = String(item.admin_id || '');
      if (!adminId) continue;
      const quantity = Number(item.quantity || 1);
      const unitPrice = Number(item.price_at_time || 0);
      const lineTotal = quantity * unitPrice;
      total += lineTotal;
      const existingGroup = grouped.get(adminId);
      if (existingGroup) {
        existingGroup.total += lineTotal;
        existingGroup.items.push(item);
      } else {
        grouped.set(adminId, { total: lineTotal, items: [item] });
      }
    }

    await this.dynamo.put(this.orderGroupsTable(), {
      id: groupId,
      user_id: userId,
      total_amount: total,
      currency: 'INR',
      status: 'payment_confirmed',
      razorpay_order_id: razorpayOrderId,
      razorpay_payment_id: razorpayPaymentId,
      created_at: now,
      updated_at: now,
    });

    const adminsToNotify = new Map<string, { email: string; shopName: string }>();
    for (const [adminId, data] of grouped.entries()) {
      const orderId = uuidv4();
      await this.dynamo.put(this.ordersTable(), {
        id: orderId,
        group_id: groupId,
        user_id: userId,
        admin_id: adminId,
        total_amount: data.total,
        currency: 'INR',
        status: 'order_received',
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
            line_total: Number(item.price_at_time || 0) * Number(item.quantity || 1),
            admin_id: item.admin_id,
            cart_item_id: item.id,
            created_at: now,
          }),
        ),
      );
      const admin = await this.dynamo.get(this.adminsTable(), { id: adminId });
      if (admin?.email) {
        adminsToNotify.set(adminId, {
          email: String(admin.email),
          shopName: String(admin.shop_name || 'Shop'),
        });
      }
    }

    const user = await this.dynamo.get(this.usersTable(), { id: userId });
    if (user?.email) {
      await this.email.sendPaymentConfirmedCustomer(String(user.email), {
        customerName: String(user.name || 'Customer'),
        orderGroupId: groupId,
        amount: total,
      });
    }
    await Promise.all(
      Array.from(adminsToNotify.entries()).map(([adminId, info]) =>
        this.email.sendPaymentConfirmedAdmin(info.email, {
          shopName: info.shopName,
          orderGroupId: groupId,
          amount: Number(grouped.get(adminId)?.total || 0),
        }),
      ),
    );

    await this.cart.clear(userId);
    this.logger.log(`Payment captured; order group ${groupId} created for user ${userId}`);
    return { ok: true, order_group_id: groupId };
  }

  private async handlePaymentFailed(payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    const payment = (((payload.payload as Record<string, unknown>)?.payment as Record<string, unknown>)?.entity ||
      {}) as Record<string, unknown>;
    const razorpayOrderId = String(payment.order_id || '');
    const userId = String((payment.notes as Record<string, unknown> | undefined)?.user_id || '');
    const failureReason = String(payment.error_description || payment.error_reason || 'Payment failed');
    if (!razorpayOrderId || !userId) {
      throw new BadRequestException('Invalid failed payment payload');
    }

    const existing = await this.findOrderGroupByRazorpayOrderId(razorpayOrderId);
    if (existing) {
      return { ok: true, duplicate: true, order_group_id: existing.id };
    }

    const groupId = uuidv4();
    const now = new Date().toISOString();
    await this.dynamo.put(this.orderGroupsTable(), {
      id: groupId,
      user_id: userId,
      total_amount: Number(payment.amount || 0) / 100,
      currency: String(payment.currency || 'INR'),
      status: 'payment_failed',
      failure_reason: failureReason,
      razorpay_order_id: razorpayOrderId,
      razorpay_payment_id: String(payment.id || ''),
      created_at: now,
      updated_at: now,
    });

    const user = await this.dynamo.get(this.usersTable(), { id: userId });
    if (user?.email) {
      await this.email.sendPaymentFailedCustomer(String(user.email), {
        customerName: String(user.name || 'Customer'),
        orderGroupId: groupId,
        reason: failureReason,
      });
    }
    this.logger.warn(`Payment failed for user ${userId}; group ${groupId} marked payment_failed`);
    return { ok: true, order_group_id: groupId, status: 'payment_failed' };
  }
}
