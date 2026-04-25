import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { DynamoService } from '../../common/dynamo/dynamo.service';
import { EmailService } from '../emails/email.service';
import { ShiprocketService } from './shiprocket.service';
import { ShipOrderDto } from './dto/ship-order.dto';

@Injectable()
export class OrdersService {
  constructor(
    private dynamo: DynamoService,
    private email: EmailService,
    private shiprocket: ShiprocketService,
  ) {}

  private ordersTable() { return this.dynamo.tableName('orders'); }
  private groupsTable() { return this.dynamo.tableName('order_groups'); }
  private orderItemsTable() { return this.dynamo.tableName('order_items'); }
  private usersTable() { return this.dynamo.tableName('users'); }
  private adminsTable() { return this.dynamo.tableName('admins'); }
  private invoicesTable() { return this.dynamo.tableName('invoices'); }

  async listForAdmin(adminId: string): Promise<Record<string, unknown>[]> {
    const items = await this.dynamo.query({
      TableName: this.ordersTable(),
      IndexName: 'AdminIndex',
      KeyConditionExpression: 'admin_id = :aid',
      ExpressionAttributeValues: { ':aid': adminId },
    });
    return items.sort(
      (a, b) =>
        new Date(String(b.created_at || 0)).getTime() - new Date(String(a.created_at || 0)).getTime(),
    );
  }

  async listGroupsForUser(userId: string): Promise<Record<string, unknown>[]> {
    const groups = await this.dynamo.query({
      TableName: this.groupsTable(),
      IndexName: 'UserIndex',
      KeyConditionExpression: 'user_id = :uid',
      ExpressionAttributeValues: { ':uid': userId },
    });

    const sortedGroups = groups.sort(
      (a, b) =>
        new Date(String(b.created_at || 0)).getTime() - new Date(String(a.created_at || 0)).getTime(),
    );

    return Promise.all(
      sortedGroups.map(async (group) => {
        const subOrders = await this.dynamo.query({
          TableName: this.ordersTable(),
          IndexName: 'GroupIndex',
          KeyConditionExpression: 'group_id = :gid',
          ExpressionAttributeValues: { ':gid': String(group.id) },
        });

        const enrichedSubOrders = await Promise.all(
          subOrders.map(async (order) => {
            const items = await this.dynamo.query({
              TableName: this.orderItemsTable(),
              KeyConditionExpression: 'order_id = :oid',
              ExpressionAttributeValues: { ':oid': String(order.id) },
            });
            const admin = await this.dynamo.get(this.adminsTable(), { id: String(order.admin_id) });
            return { ...order, shop_name: admin?.shop_name ?? null, items };
          }),
        );

        return { ...group, sub_orders: enrichedSubOrders };
      }),
    );
  }

  async cancelGroupForUser(userId: string, groupId: string): Promise<Record<string, unknown>> {
    const group = await this.dynamo.get(this.groupsTable(), { id: groupId });
    if (!group || String(group.user_id) !== userId) throw new NotFoundException('Order group not found');

    const status = String(group.status || '');
    if (status === 'order_cancelled' || status === 'payment_failed') {
      throw new BadRequestException(`Order cannot be cancelled from status: ${status}`);
    }

    const now = new Date().toISOString();
    await this.dynamo.update(this.groupsTable(), { id: groupId }, {
      status: 'order_cancelled', cancelled_at: now, updated_at: now,
    });

    const subOrders = await this.dynamo.query({
      TableName: this.ordersTable(),
      IndexName: 'GroupIndex',
      KeyConditionExpression: 'group_id = :gid',
      ExpressionAttributeValues: { ':gid': groupId },
    });

    await Promise.all(
      subOrders.map((order) =>
        this.dynamo.update(this.ordersTable(), { id: String(order.id) }, {
          status: 'order_cancelled', cancelled_at: now, updated_at: now,
        }),
      ),
    );

    const user = await this.dynamo.get(this.usersTable(), { id: userId });
    if (user?.email) {
      await this.email.sendOrderCancelled(String(user.email), 'customer', {
        recipientName: String(user.name || 'Customer'),
        orderGroupId: groupId,
      });
    }

    const adminIds = [...new Set(subOrders.map((o) => String(o.admin_id)).filter(Boolean))];
    await Promise.all(
      adminIds.map(async (adminId) => {
        const admin = await this.dynamo.get(this.adminsTable(), { id: adminId });
        if (!admin?.email) return;
        await this.email.sendOrderCancelled(String(admin.email), 'admin', {
          recipientName: String(admin.owner_name || admin.shop_name || 'Admin'),
          orderGroupId: groupId,
        });
      }),
    );

    return { cancelled: true, order_group_id: groupId };
  }

  async shipOrderForAdmin(adminId: string, orderId: string, dto: ShipOrderDto): Promise<Record<string, unknown>> {
    const order = await this.dynamo.get(this.ordersTable(), { id: orderId });
    if (!order || String(order.admin_id) !== adminId) throw new NotFoundException('Order not found');

    const shippableStatuses = new Set(['order_received', 'payment_confirmed']);
    if (!shippableStatuses.has(String(order.status || ''))) {
      throw new BadRequestException(`Cannot ship order in status: ${order.status}`);
    }

    const user = await this.dynamo.get(this.usersTable(), { id: String(order.user_id) });
    if (!user) throw new NotFoundException('Customer not found');

    const items = await this.dynamo.query({
      TableName: this.orderItemsTable(),
      KeyConditionExpression: 'order_id = :oid',
      ExpressionAttributeValues: { ':oid': orderId },
    });
    if (!items.length) throw new BadRequestException('Order has no items');

    const shipment = await this.shiprocket.createShipment({
      orderId,
      orderDate: new Date().toISOString().slice(0, 10),
      customerName: dto.delivery_name,
      customerPhone: dto.delivery_phone,
      deliveryAddress: dto.delivery_address,
      deliveryCity: dto.delivery_city,
      deliveryState: dto.delivery_state,
      deliveryPincode: dto.delivery_pincode,
      totalAmount: Number(order.total_amount || 0),
      weight: dto.weight ?? 0.5,
      items: items.map((item, idx) => ({
        name: String(item.product_name || `Item ${idx + 1}`),
        sku: String(item.product_id || `SKU-${idx}`),
        units: Number(item.quantity || 1),
        selling_price: Number(item.unit_price || 0),
      })),
    });

    const now = new Date().toISOString();
    const updated = await this.dynamo.update(this.ordersTable(), { id: orderId }, {
      status: 'shipment_created',
      awb_number: shipment.awb_number,
      courier_name: shipment.courier_name,
      shiprocket_order_id: shipment.shiprocket_order_id,
      shiprocket_shipment_id: shipment.shipment_id,
      tracking_url: this.shiprocket.trackingUrl(shipment.awb_number),
      shipped_at: now,
      updated_at: now,
    });

    if (user.email) {
      await this.email.sendOrderShipped(String(user.email), {
        customerName: String(user.name || dto.delivery_name),
        orderId,
        trackingNumber: shipment.awb_number,
        courierName: shipment.courier_name,
        trackingUrl: this.shiprocket.trackingUrl(shipment.awb_number),
      });
    }

    return updated;
  }

  /** Called by ShiprocketWebhookController on each status update */
  async handleShiprocketWebhook(payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    const awb = String(payload.awb || payload.awb_code || '');
    const rawStatus = String(payload.current_status || payload.status || '').toLowerCase().trim();

    const statusMap: Record<string, string> = {
      'picked up': 'picked_up',
      'in transit': 'in_transit',
      'out for delivery': 'out_for_delivery',
      delivered: 'delivered',
      'pickup scheduled': 'pickup_scheduled',
      'pickup queued': 'pickup_queued',
    };

    const internalStatus = statusMap[rawStatus];
    if (!internalStatus || internalStatus === 'pickup_scheduled' || internalStatus === 'pickup_queued') {
      return { ok: true, ignored: true, reason: `status not actionable: ${rawStatus}` };
    }

    if (!awb) return { ok: true, ignored: true, reason: 'no awb in payload' };

    const order = await this.shiprocket.findOrderByAwb(awb);
    if (!order) return { ok: true, ignored: true, reason: 'order not found for awb' };

    if (String(order.status || '') === internalStatus) {
      return { ok: true, duplicate: true, order_id: order.id, status: internalStatus };
    }

    const now = new Date().toISOString();
    const updates: Record<string, unknown> = { status: internalStatus, updated_at: now };
    if (internalStatus === 'picked_up') updates.picked_up_at = now;
    if (internalStatus === 'in_transit') updates.in_transit_at = now;
    if (internalStatus === 'out_for_delivery') updates.out_for_delivery_at = now;
    if (internalStatus === 'delivered') updates.delivered_at = now;

    await this.dynamo.update(this.ordersTable(), { id: String(order.id) }, updates);

    const user = await this.dynamo.get(this.usersTable(), { id: String(order.user_id) });
    if (user?.email) {
      await this.email.sendOrderStageUpdate(String(user.email), {
        customerName: String(user.name || 'Customer'),
        orderId: String(order.id),
        stage: internalStatus as 'picked_up' | 'in_transit' | 'out_for_delivery' | 'delivered',
        trackingNumber: awb,
        courierName: String(order.courier_name || payload.courier_name || 'Courier'),
      });
    }

    if (internalStatus === 'delivered') {
      await this.generateInvoiceIfMissing(order);
    }

    return { ok: true, order_id: order.id, status: internalStatus };
  }

  private async generateInvoiceIfMissing(order: Record<string, unknown>): Promise<void> {
    const existing = await this.dynamo.queryOne({
      TableName: this.invoicesTable(),
      IndexName: 'OrderIndex',
      KeyConditionExpression: 'order_id = :oid',
      ExpressionAttributeValues: { ':oid': String(order.id) },
    });
    if (existing) return;

    const now = new Date().toISOString();
    const invoiceId = uuidv4();
    const datePart = now.slice(0, 10).replace(/-/g, '');
    await this.dynamo.put(this.invoicesTable(), {
      id: invoiceId,
      order_id: String(order.id),
      group_id: String(order.group_id || ''),
      user_id: String(order.user_id || ''),
      admin_id: String(order.admin_id || ''),
      total_amount: Number(order.total_amount || 0),
      currency: String(order.currency || 'INR'),
      invoice_number: `INV-${datePart}-${invoiceId.slice(0, 6).toUpperCase()}`,
      status: 'generated',
      issued_at: now,
      created_at: now,
      updated_at: now,
    });
  }
}
