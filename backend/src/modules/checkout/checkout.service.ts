import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import Razorpay from 'razorpay';
import { createHmac } from 'crypto';
import { DynamoService } from '../../common/dynamo/dynamo.service';
import { CartService } from '../cart/cart.service';
import { EmailService } from '../emails/email.service';
import { ConfirmPaymentDto } from './dto/confirm-payment.dto';
import { PushService } from '../push/push.service';
import { ElectricianService } from '../electrician/electrician.service';

@Injectable()
export class CheckoutService {
  private readonly logger = new Logger(CheckoutService.name);
  private razorpayClient: Razorpay | null = null;

  constructor(
    private dynamo: DynamoService,
    private config: ConfigService,
    private cart: CartService,
    private email: EmailService,
    private push: PushService,
    private electricians: ElectricianService,
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

  private verifyClientPaymentSignature(
    razorpayOrderId: string,
    razorpayPaymentId: string,
    razorpaySignature: string,
  ): void {
    const secret = this.config.get<string>('RAZORPAY_KEY_SECRET');
    if (!secret) {
      throw new BadRequestException('RAZORPAY_KEY_SECRET is not configured');
    }
    const expected = createHmac('sha256', secret)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest('hex');
    if (expected !== razorpaySignature) {
      throw new BadRequestException('Invalid Razorpay payment signature');
    }
  }

  async confirmPayment(userId: string, dto: ConfirmPaymentDto): Promise<Record<string, unknown>> {
    const razorpayOrderId = String(dto.razorpay_order_id || '');
    if (!razorpayOrderId) {
      throw new BadRequestException('razorpay_order_id is required');
    }

    const existing = await this.findOrderGroupByRazorpayOrderId(razorpayOrderId);
    if (existing) {
      if (String(existing.user_id || '') !== userId) {
        throw new BadRequestException('Order does not belong to this user');
      }
      return { ok: true, duplicate: true, order_group_id: existing.id, status: existing.status };
    }

    if (dto.status === 'success') {
      const paymentId = String(dto.razorpay_payment_id || '');
      const signature = String(dto.razorpay_signature || '');
      if (!paymentId || !signature) {
        throw new BadRequestException(
          'razorpay_payment_id and razorpay_signature are required for success',
        );
      }
      this.verifyClientPaymentSignature(razorpayOrderId, paymentId, signature);
      return this.handlePaymentCaptured(
        {
          event: 'payment.captured',
          payload: {
            payment: {
              entity: {
                id: paymentId,
                order_id: razorpayOrderId,
                notes: { user_id: userId },
              },
            },
          },
        },
        { deliveryAddressIndex: dto.delivery_address_index },
      );
    }

    return this.handlePaymentFailed({
      event: 'payment.failed',
      payload: {
        payment: {
          entity: {
            id: String(dto.razorpay_payment_id || ''),
            order_id: razorpayOrderId,
            amount: 0,
            currency: 'INR',
            notes: { user_id: userId },
            error_description: dto.failure_reason || 'Payment failed from client callback',
          },
        },
      },
    });
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
    try {
      const rows = await this.dynamo.query({
        TableName: this.orderGroupsTable(),
        IndexName: 'RazorpayOrderIndex',
        KeyConditionExpression: 'razorpay_order_id = :roid',
        ExpressionAttributeValues: { ':roid': orderId },
        Limit: 5,
      });
      if (rows[0]) return rows[0];
    } catch {
      // Legacy tables without RazorpayOrderIndex — fall back to scan (slow).
    }
    const groups = await this.dynamo.scan({
      TableName: this.orderGroupsTable(),
      FilterExpression: 'razorpay_order_id = :roid',
      ExpressionAttributeValues: { ':roid': orderId },
    });
    return groups[0] || null;
  }

  private deliveryPointFromSnapshotOrUser(
    snapshot: Record<string, unknown> | null | undefined,
    user: Record<string, unknown> | null,
  ): { lat: number; lng: number } | null {
    if (snapshot && typeof snapshot === 'object') {
      const lat = Number(snapshot.lat);
      const lng = Number(snapshot.lng);
      if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
        return { lat, lng };
      }
    }
    return this.extractLatLngFromUser(user);
  }

  private extractLatLngFromUser(user: Record<string, unknown> | null): { lat: number; lng: number } | null {
    if (!user) return null;
    const fromRootLat = Number(user.lat);
    const fromRootLng = Number(user.lng);
    if (!Number.isNaN(fromRootLat) && !Number.isNaN(fromRootLng)) {
      return { lat: fromRootLat, lng: fromRootLng };
    }

    const addressBook = Array.isArray(user.address_book)
      ? (user.address_book as Record<string, unknown>[])
      : [];
    const primary = addressBook.find((a) => Boolean(a.is_default)) || addressBook[0];
    const lat = Number(primary?.lat);
    const lng = Number(primary?.lng);
    if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
      return { lat, lng };
    }
    return null;
  }

  private summarizeProductForAlert(cartItems: Record<string, unknown>[]): string {
    const names = Array.from(
      new Set(
        cartItems
          .map((it) => String(it.product_name || '').trim())
          .filter(Boolean),
      ),
    );
    if (!names.length) return 'product';
    if (names.length === 1) return names[0];
    return `${names[0]} (+${names.length - 1} more)`;
  }

  private async notifyNearbyElectriciansAboutOrder(
    params: { lat: number; lng: number; productName: string; areaLabel?: string },
  ): Promise<void> {
    const nearby = await this.electricians.findNearbyApprovedAvailable(
      params.lat,
      params.lng,
      10,
    );
    if (!nearby.length) return;
    await Promise.all(
      nearby.map(async (electrician) => {
        const electricianName = String(electrician.name || 'Electrician');
        const distanceKm = Number(electrician.distance_km || 0);
        const area = String(params.areaLabel || 'your area').trim() || 'your area';
        await Promise.all([
          this.push.sendToToken(String(electrician.fcm_token || ''), {
            title: 'Order nearby',
            body: `${params.productName} was just ordered in ${area}, ${distanceKm.toFixed(1)} km from you. This customer may need service soon.`,
            data: {
              type: 'nearby_order_awareness',
              product_name: params.productName,
              distance_km: String(distanceKm),
            },
          }),
          electrician.email
            ? this.email.sendNearbyOrderAlertToElectrician(String(electrician.email), {
                electricianName,
                productName: params.productName,
                distanceKm,
              })
            : Promise.resolve(),
        ]);
      }),
    );
  }

  private async handlePaymentCaptured(
    payload: Record<string, unknown>,
    meta?: { deliveryAddressIndex?: number },
  ): Promise<Record<string, unknown>> {
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

    const user = await this.dynamo.get(this.usersTable(), { id: userId });
    let delivery_snapshot: Record<string, unknown> | null = null;
    if (
      user &&
      meta?.deliveryAddressIndex !== undefined &&
      meta.deliveryAddressIndex !== null &&
      !Number.isNaN(Number(meta.deliveryAddressIndex))
    ) {
      const book = Array.isArray((user as Record<string, unknown>).address_book)
        ? ((user as Record<string, unknown>).address_book as Record<string, unknown>[])
        : [];
      const sel = book[Number(meta.deliveryAddressIndex)];
      if (sel && typeof sel === 'object') {
        delivery_snapshot = { ...sel };
      }
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
      ...(delivery_snapshot ? { delivery_snapshot } : {}),
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

    if (user?.email) {
      await this.email.sendPaymentConfirmedCustomer(String(user.email), {
        customerName: String(user.name || 'Customer'),
        orderGroupId: groupId,
        amount: total,
      });
    }
    await this.push.sendToToken(String(user?.fcm_token || ''), {
      title: 'Payment Confirmed',
      body: `Order ${groupId} is confirmed.`,
      data: { order_group_id: groupId, type: 'payment_confirmed' },
    });
    await Promise.all(
      Array.from(adminsToNotify.entries()).map(([adminId, info]) =>
        this.email.sendPaymentConfirmedAdmin(info.email, {
          shopName: info.shopName,
          orderGroupId: groupId,
          amount: Number(grouped.get(adminId)?.total || 0),
        }),
      ),
    );

    const deliveryPoint = this.deliveryPointFromSnapshotOrUser(
      delivery_snapshot,
      (user as Record<string, unknown> | null) || null,
    );
    if (deliveryPoint) {
      const productName = this.summarizeProductForAlert(
        cartItems as Record<string, unknown>[],
      );
      const snap = delivery_snapshot as Record<string, unknown> | null;
      const areaLabel = snap
        ? String(snap.city || snap.line1 || snap.label || snap.area || '').trim()
        : '';
      void this.notifyNearbyElectriciansAboutOrder({
        lat: deliveryPoint.lat,
        lng: deliveryPoint.lng,
        productName,
        ...(areaLabel ? { areaLabel } : {}),
      }).catch((err) => {
        this.logger.warn(`Nearby electrician awareness failed: ${err?.message || err}`);
      });
    }

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
    await this.push.sendToToken(String(user?.fcm_token || ''), {
      title: 'Payment Failed',
      body: `Payment failed for order ${groupId}.`,
      data: { order_group_id: groupId, type: 'payment_failed' },
    });
    this.logger.warn(`Payment failed for user ${userId}; group ${groupId} marked payment_failed`);
    return { ok: true, order_group_id: groupId, status: 'payment_failed' };
  }
}
