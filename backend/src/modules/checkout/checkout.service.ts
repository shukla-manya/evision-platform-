import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import { DynamoService } from '../../common/dynamo/dynamo.service';
import { CartService } from '../cart/cart.service';
import { EmailService } from '../emails/email.service';
import { CreateCheckoutDto } from './dto/create-checkout.dto';
import { PushService } from '../push/push.service';
import { ElectricianService } from '../electrician/electrician.service';
import { buildPayuPaymentHash, verifyPayuResponseHash } from './payu-hash.util';

@Injectable()
export class CheckoutService {
  private readonly logger = new Logger(CheckoutService.name);

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

  private payuKey(): string {
    const k = this.config.get<string>('PAYU_MERCHANT_KEY') || this.config.get<string>('PAYU_KEY');
    if (!k) throw new BadRequestException('PayU is not configured. Set PAYU_MERCHANT_KEY (or PAYU_KEY) and PAYU_SALT');
    return k;
  }

  private payuSalt(): string {
    const s = this.config.get<string>('PAYU_SALT');
    if (!s) throw new BadRequestException('PAYU_SALT is not configured');
    return s;
  }

  private payuActionUrl(): string {
    const mode = String(this.config.get('PAYU_MODE') || 'test').toLowerCase();
    if (mode === 'production' || mode === 'prod' || mode === 'live') {
      return 'https://secure.payu.in/_payment';
    }
    return 'https://test.payu.in/_payment';
  }

  private callbackBaseUrl(): string {
    const b =
      this.config.get<string>('BACKEND_PUBLIC_URL') ||
      this.config.get<string>('API_PUBLIC_URL') ||
      `http://localhost:${this.config.get('PORT', '8000')}`;
    return String(b).replace(/\/$/, '');
  }

  private frontendBaseUrl(): string {
    return String(this.config.get('FRONTEND_URL', 'http://localhost:3000')).replace(/\/$/, '');
  }

  async createOrder(userId: string, dto?: CreateCheckoutDto): Promise<Record<string, unknown>> {
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

    if (total <= 0) {
      throw new BadRequestException('Total amount must be greater than zero');
    }

    const user = await this.dynamo.get(this.usersTable(), { id: userId });
    if (!user) throw new BadRequestException('User not found');

    const amountStr = total.toFixed(2);
    const txnid = `EV${uuidv4().replace(/-/g, '').slice(0, 20)}`;
    const key = this.payuKey();
    const salt = this.payuSalt();
    const email = String((user as { email?: string }).email || 'customer@example.com');
    const name = String((user as { name?: string }).name || 'Customer');
    const phone = String((user as { phone?: string }).phone || '9999999999').replace(/\D/g, '') || '9999999999';
    const deliveryIdx =
      dto?.delivery_address_index !== undefined && dto.delivery_address_index !== null
        ? String(Math.max(0, Math.floor(dto.delivery_address_index)))
        : '0';

    const udf1 = userId;
    const udf2 = amountStr;
    const udf3 = deliveryIdx;
    const udf4 = '';
    const udf5 = '';

    const productinfo = 'E vision cart checkout';
    const hash = buildPayuPaymentHash({
      key,
      txnid,
      amount: amountStr,
      productinfo,
      firstname: name.split(/\s+/)[0] || name,
      email,
      udf1,
      udf2,
      udf3,
      udf4,
      udf5,
      salt,
    });

    const surl = `${this.callbackBaseUrl()}/webhooks/payu/return`;
    const furl = surl;

    return {
      payment_provider: 'payu',
      action: this.payuActionUrl(),
      method: 'POST',
      fields: {
        key,
        txnid,
        amount: amountStr,
        productinfo,
        firstname: name.split(/\s+/)[0] || name,
        email,
        phone,
        surl,
        furl,
        udf1,
        udf2,
        udf3,
        udf4,
        udf5,
        hash,
      },
      amount: total,
      currency: 'INR',
      txnid,
    };
  }

  /** PayU browser return (surl/furl): verify hash, then finalize order or redirect to failure. */
  async handlePayuBrowserReturn(body: Record<string, string>): Promise<string> {
    const front = this.frontendBaseUrl();
    const salt = this.payuSalt();

    if (!verifyPayuResponseHash(body, salt)) {
      this.logger.warn('PayU return: invalid hash');
      return `${front}/checkout/failure?reason=invalid_hash`;
    }

    const status = String(body.status || '').toLowerCase();
    const txnid = String(body.txnid || '');
    const userId = String(body.udf1 || '');
    const amountExpected = String(body.udf2 || '');
    const mihpayid = String(body.mihpayid || '');

    if (!txnid || !userId) {
      return `${front}/checkout/failure?reason=invalid_response`;
    }

    if (amountExpected && Math.abs(Number(body.amount) - Number(amountExpected)) > 0.02) {
      this.logger.warn('PayU return: amount mismatch');
      return `${front}/checkout/failure?reason=amount_mismatch`;
    }

    const deliveryIdx = Number.parseInt(String(body.udf3 ?? '0'), 10);
    const deliveryAddressIndex = Number.isFinite(deliveryIdx) ? deliveryIdx : 0;

    if (status === 'success') {
      try {
        const out = await this.finalizeSuccessfulPayment(userId, txnid, mihpayid, deliveryAddressIndex);
        const gid = String(out.order_group_id || '');
        const tail = gid.replace(/-/g, '').slice(-4).toUpperCase();
        const ref = encodeURIComponent(`G${tail}`);
        const ship = out.shipments != null ? `&shipments=${encodeURIComponent(String(out.shipments))}` : '';
        return `${front}/checkout/success?group=${encodeURIComponent(gid)}&ref=${ref}${ship}`;
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        this.logger.error(`PayU success finalize failed: ${msg}`);
        return `${front}/checkout/failure?reason=${encodeURIComponent('finalize_failed')}`;
      }
    }

    const reason = String(body.field9 || body.error_Message || body.error || 'payment_failed');
    try {
      await this.finalizeFailedPayment(userId, txnid, mihpayid, Number(body.amount) || 0, reason);
    } catch (e: unknown) {
      this.logger.warn(`PayU failure record: ${e instanceof Error ? e.message : e}`);
    }
    return `${front}/checkout/failure?reason=${encodeURIComponent(reason.slice(0, 120))}`;
  }

  private async findOrderGroupByGatewayTxnId(txnId: string): Promise<Record<string, unknown> | null> {
    try {
      const rows = await this.dynamo.query({
        TableName: this.orderGroupsTable(),
        IndexName: 'RazorpayOrderIndex',
        KeyConditionExpression: 'razorpay_order_id = :roid',
        ExpressionAttributeValues: { ':roid': txnId },
        Limit: 5,
      });
      if (rows[0]) return rows[0];
    } catch {
      /* index missing */
    }
    const groups = await this.dynamo.scan({
      TableName: this.orderGroupsTable(),
      FilterExpression: 'razorpay_order_id = :roid',
      ExpressionAttributeValues: { ':roid': txnId },
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

  private async finalizeSuccessfulPayment(
    userId: string,
    gatewayTxnId: string,
    gatewayPaymentId: string,
    deliveryAddressIndex: number,
  ): Promise<{ order_group_id: string; duplicate?: boolean; shipments?: number }> {
    const existing = await this.findOrderGroupByGatewayTxnId(gatewayTxnId);
    if (existing) {
      if (String(existing.user_id || '') !== userId) {
        throw new BadRequestException('Order does not belong to this user');
      }
      return { order_group_id: String(existing.id), duplicate: true, shipments: undefined };
    }

    const cartItems = await this.cart.listUserItems(userId);
    if (!cartItems.length) {
      throw new BadRequestException('Cart is empty for this user; cannot materialize order');
    }

    const user = await this.dynamo.get(this.usersTable(), { id: userId });
    let delivery_snapshot: Record<string, unknown> | null = null;
    if (
      user &&
      deliveryAddressIndex !== undefined &&
      deliveryAddressIndex !== null &&
      !Number.isNaN(Number(deliveryAddressIndex))
    ) {
      const book = Array.isArray((user as Record<string, unknown>).address_book)
        ? ((user as Record<string, unknown>).address_book as Record<string, unknown>[])
        : [];
      const sel = book[Number(deliveryAddressIndex)];
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
      razorpay_order_id: gatewayTxnId,
      razorpay_payment_id: gatewayPaymentId,
      payment_provider: 'payu',
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

    const shipments = grouped.size;

    await this.cart.clear(userId);
    this.logger.log(`PayU captured; order group ${groupId} created for user ${userId}`);
    return { order_group_id: groupId, shipments };
  }

  private async finalizeFailedPayment(
    userId: string,
    gatewayTxnId: string,
    gatewayPaymentId: string,
    amount: number,
    failureReason: string,
  ): Promise<{ order_group_id: string; duplicate?: boolean }> {
    const existing = await this.findOrderGroupByGatewayTxnId(gatewayTxnId);
    if (existing) {
      return { order_group_id: String(existing.id), duplicate: true };
    }

    const groupId = uuidv4();
    const now = new Date().toISOString();
    await this.dynamo.put(this.orderGroupsTable(), {
      id: groupId,
      user_id: userId,
      total_amount: amount,
      currency: 'INR',
      status: 'payment_failed',
      failure_reason: failureReason,
      razorpay_order_id: gatewayTxnId,
      razorpay_payment_id: gatewayPaymentId,
      payment_provider: 'payu',
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
    this.logger.warn(`PayU failed for user ${userId}; group ${groupId} marked payment_failed`);
    return { order_group_id: groupId };
  }
}
