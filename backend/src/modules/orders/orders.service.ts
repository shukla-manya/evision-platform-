import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { DynamoService } from '../../common/dynamo/dynamo.service';
import { EmailService } from '../emails/email.service';
import { ShiprocketService } from './shiprocket.service';

@Injectable()
export class OrdersService {
  constructor(
    private dynamo: DynamoService,
    private email: EmailService,
    private shiprocket: ShiprocketService,
  ) {}

  private ordersTable() {
    return this.dynamo.tableName('orders');
  }

  private groupsTable() {
    return this.dynamo.tableName('order_groups');
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

  private invoicesTable() {
    return this.dynamo.tableName('invoices');
  }

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
            return {
              ...order,
              shop_name: admin?.shop_name ?? null,
              items,
            };
          }),
        );

        return {
          ...group,
          sub_orders: enrichedSubOrders,
        };
      }),
    );
  }

  async cancelGroupForUser(userId: string, groupId: string): Promise<Record<string, unknown>> {
    const group = await this.dynamo.get(this.groupsTable(), { id: groupId });
    if (!group || String(group.user_id) !== userId) {
      throw new NotFoundException('Order group not found');
    }
    const status = String(group.status || '');
    if (status === 'order_cancelled' || status === 'payment_failed') {
      throw new BadRequestException(`Order cannot be cancelled from status ${status}`);
    }

    const now = new Date().toISOString();
    await this.dynamo.update(this.groupsTable(), { id: groupId }, {
      status: 'order_cancelled',
      cancelled_at: now,
      updated_at: now,
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
          status: 'order_cancelled',
          cancelled_at: now,
          updated_at: now,
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

  private async assertAdminCanShip(adminId: string, orderId: string): Promise<Record<string, unknown>> {
    const order = await this.dynamo.get(this.ordersTable(), { id: orderId });
    if (!order) throw new NotFoundException('Order not found');
    if (String(order.admin_id) !== adminId) {
      throw new NotFoundException('Order not found');
    }
    return order;
  }

  private stageFromShiprocketStatus(raw: string): 'picked_up' | 'in_transit' | 'out_for_delivery' | 'delivered' | null {
    const s = raw.trim().toLowerCase();
    if (!s) return null;
    if (s.includes('pickup') || s.includes('picked')) return 'picked_up';
    if (s.includes('out for delivery')) return 'out_for_delivery';
    if (s.includes('transit')) return 'in_transit';
    if (s.includes('delivered')) return 'delivered';
    return null;
  }

  private async defaultAddressForUser(user: Record<string, unknown>): Promise<{ address: string; city: string; state: string; pincode: string; country: string }> {
    const addresses = Array.isArray(user.address_book) ? (user.address_book as Record<string, unknown>[]) : [];
    const picked =
      addresses.find((a) => Boolean(a.is_default)) ||
      addresses[0] ||
      null;
    const rawAddress = String((picked?.address as string) || user.address || 'Address unavailable');
    return {
      address: rawAddress,
      city: String((picked?.city as string) || 'Faridabad'),
      state: String((picked?.state as string) || 'Haryana'),
      pincode: String((picked?.pincode as string) || '121001'),
      country: String((picked?.country as string) || 'India'),
    };
  }

  async shipOrderForAdmin(adminId: string, orderId: string): Promise<Record<string, unknown>> {
    const order = await this.assertAdminCanShip(adminId, orderId);
    if (String(order.status || '').toLowerCase() === 'delivered') {
      throw new BadRequestException('Order is already delivered');
    }

    const user = await this.dynamo.get(this.usersTable(), { id: String(order.user_id) });
    if (!user) throw new NotFoundException('Customer not found');
    const items = await this.dynamo.query({
      TableName: this.orderItemsTable(),
      KeyConditionExpression: 'order_id = :oid',
      ExpressionAttributeValues: { ':oid': orderId },
    });
    if (!items.length) throw new BadRequestException('Order has no items');

    const addr = await this.defaultAddressForUser(user);
    const shipment = await this.shiprocket.createShipment({
      orderId,
      orderDateIso: new Date().toISOString(),
      pickupLocation: 'Primary',
      customerName: String(user.name || 'Customer'),
      customerEmail: String(user.email || ''),
      customerPhone: String(user.phone || ''),
      billingAddress: addr.address,
      billingCity: addr.city,
      billingState: addr.state,
      billingPincode: addr.pincode,
      billingCountry: addr.country,
      paymentMethod: 'Prepaid',
      subTotal: Number(order.total_amount || 0),
      items: items.map((item, idx) => ({
        name: String(item.product_name || `Item ${idx + 1}`),
        sku: String(item.product_id || `SKU-${idx + 1}`),
        units: Number(item.quantity || 1),
        selling_price: Number(item.unit_price || 0),
      })),
    });

    const now = new Date().toISOString();
    const updated = await this.dynamo.update(this.ordersTable(), { id: orderId }, {
      status: 'shipment_created',
      shipping_provider: 'shiprocket',
      shiprocket_order_id: shipment.shiprocket_order_id,
      shiprocket_shipment_id: shipment.shipment_id,
      awb_number: shipment.awb_number,
      courier_name: shipment.courier_name,
      tracking_url: shipment.tracking_url,
      shipped_at: now,
      updated_at: now,
    });

    if (user.email) {
      await this.email.sendOrderShipped(
        String(user.email),
        {
          customerName: String(user.name || 'Customer'),
          orderId,
          trackingNumber: shipment.awb_number || 'Not assigned yet',
          courierName: shipment.courier_name || 'Shiprocket',
          trackingUrl: shipment.tracking_url || '',
        },
      );
    }
    return updated;
  }

  private async findOrderForShiprocketWebhook(payload: Record<string, unknown>): Promise<Record<string, unknown> | null> {
    const orderId = String(payload.order_id || payload.orderId || '');
    if (orderId && /^[0-9a-f-]{36}$/i.test(orderId)) {
      const byId = await this.dynamo.get(this.ordersTable(), { id: orderId });
      if (byId) return byId;
    }

    const awb = String(payload.awb || payload.awb_code || '');
    if (awb) {
      const byAwb = await this.dynamo.scan({
        TableName: this.ordersTable(),
        FilterExpression: 'awb_number = :awb',
        ExpressionAttributeValues: { ':awb': awb },
      });
      if (byAwb.length) return byAwb[0];
    }

    const shipmentId = String(payload.shipment_id || payload.shipmentId || '');
    if (shipmentId) {
      const byShipment = await this.dynamo.scan({
        TableName: this.ordersTable(),
        FilterExpression: 'shiprocket_shipment_id = :sid',
        ExpressionAttributeValues: { ':sid': shipmentId },
      });
      if (byShipment.length) return byShipment[0];
    }
    return null;
  }

  private async maybeGenerateInvoiceForDelivered(order: Record<string, unknown>): Promise<void> {
    const existing = await this.dynamo.queryOne({
      TableName: this.invoicesTable(),
      IndexName: 'OrderIndex',
      KeyConditionExpression: 'order_id = :oid',
      ExpressionAttributeValues: { ':oid': String(order.id) },
    });
    if (existing) return;
    const now = new Date().toISOString();
    const invoiceId = uuidv4();
    await this.dynamo.put(this.invoicesTable(), {
      id: invoiceId,
      order_id: String(order.id),
      group_id: String(order.group_id || ''),
      user_id: String(order.user_id || ''),
      admin_id: String(order.admin_id || ''),
      amount: Number(order.total_amount || 0),
      currency: String(order.currency || 'INR'),
      invoice_number: `INV-${now.slice(0, 10).replace(/-/g, '')}-${invoiceId.slice(0, 6).toUpperCase()}`,
      status: 'generated',
      issued_at: now,
      created_at: now,
    });
  }

  async handleShiprocketWebhook(payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    const rawStatus = String(payload.current_status || payload.status || payload.shipment_status || '');
    const stage = this.stageFromShiprocketStatus(rawStatus);
    if (!stage) return { ok: true, ignored: true, reason: 'status_not_mapped' };

    const order = await this.findOrderForShiprocketWebhook(payload);
    if (!order) return { ok: true, ignored: true, reason: 'order_not_found' };

    const now = new Date().toISOString();
    const updates: Record<string, unknown> = {
      status: stage,
      shiprocket_raw_status: rawStatus,
      updated_at: now,
    };
    if (payload.awb || payload.awb_code) {
      updates.awb_number = String(payload.awb || payload.awb_code);
    }
    if (payload.courier_name || payload.courier) {
      updates.courier_name = String(payload.courier_name || payload.courier);
    }
    if (stage === 'picked_up') updates.picked_up_at = now;
    if (stage === 'in_transit') updates.in_transit_at = now;
    if (stage === 'out_for_delivery') updates.out_for_delivery_at = now;
    if (stage === 'delivered') updates.delivered_at = now;

    await this.dynamo.update(this.ordersTable(), { id: String(order.id) }, updates);

    const user = await this.dynamo.get(this.usersTable(), { id: String(order.user_id) });
    if (user?.email) {
      await this.email.sendOrderStageUpdate(
        String(user.email),
        {
          customerName: String(user.name || 'Customer'),
          orderId: String(order.id),
          stage,
          trackingNumber: String(updates.awb_number || order.awb_number || ''),
          courierName: String(updates.courier_name || order.courier_name || 'Shiprocket'),
        },
      );
    }

    if (stage === 'delivered') {
      await this.maybeGenerateInvoiceForDelivered(order);
      const groupId = String(order.group_id || '');
      if (groupId) {
        const siblings = await this.dynamo.query({
          TableName: this.ordersTable(),
          IndexName: 'GroupIndex',
          KeyConditionExpression: 'group_id = :gid',
          ExpressionAttributeValues: { ':gid': groupId },
        });
        const allDelivered = siblings.every(
          (s) => String(s.id) === String(order.id) || String(s.status || '') === 'delivered',
        );
        if (allDelivered) {
          await this.dynamo.update(this.groupsTable(), { id: groupId }, {
            status: 'delivered',
            delivered_at: now,
            updated_at: now,
          });
        }
      }
    }

    return { ok: true, order_id: order.id, status: stage };
  }
}
