import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import PDFDocument = require('pdfkit');
import { DynamoService } from '../../common/dynamo/dynamo.service';
import { EmailService } from '../emails/email.service';
import { ShiprocketService } from './shiprocket.service';
import { ShipOrderDto } from './dto/ship-order.dto';
import { S3Service } from '../../common/s3/s3.service';
import { PushService } from '../push/push.service';

@Injectable()
export class OrdersService {
  constructor(
    private dynamo: DynamoService,
    private email: EmailService,
    private shiprocket: ShiprocketService,
    private s3: S3Service,
    private push: PushService,
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

  async getAdminOrderById(adminId: string, orderId: string): Promise<Record<string, unknown>> {
    const order = await this.dynamo.get(this.ordersTable(), { id: orderId });
    if (!order || String(order.admin_id) !== adminId) throw new NotFoundException('Order not found');
    const items = await this.dynamo.query({
      TableName: this.orderItemsTable(),
      KeyConditionExpression: 'order_id = :oid',
      ExpressionAttributeValues: { ':oid': orderId },
    });
    const user = await this.dynamo.get(this.usersTable(), { id: String(order.user_id) });
    const group = await this.dynamo.get(this.groupsTable(), { id: String(order.group_id) });
    return {
      ...order,
      items,
      customer: user
        ? {
            id: user.id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            role: user.role,
            gst_no: user.gst_no,
          }
        : null,
      order_group: group
        ? { id: group.id, status: group.status, total_amount: group.total_amount }
        : null,
    };
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
    await this.push.sendToToken(String(user?.fcm_token || ''), {
      title: 'Order Cancelled',
      body: `Order ${groupId} has been cancelled.`,
      data: { order_group_id: groupId, type: 'order_cancelled' },
    });

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

  private pickAddressData(
    user: Record<string, unknown>,
    dto: ShipOrderDto,
  ): {
    name: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    pincode: string;
  } {
    const addresses = Array.isArray(user.address_book)
      ? (user.address_book as Record<string, unknown>[])
      : [];
    const primary =
      addresses.find((a) => Boolean(a.is_default)) ||
      addresses[0] ||
      null;
    return {
      name: dto.delivery_name || String(user.name || 'Customer'),
      phone: dto.delivery_phone || String(user.phone || ''),
      address:
        dto.delivery_address ||
        String((primary?.address as string) || user.address || 'Address unavailable'),
      city: dto.delivery_city || String((primary?.city as string) || 'Faridabad'),
      state: dto.delivery_state || String((primary?.state as string) || 'Haryana'),
      pincode: dto.delivery_pincode || String((primary?.pincode as string) || '121001'),
    };
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
    const address = this.pickAddressData(user, dto || {});

    const items = await this.dynamo.query({
      TableName: this.orderItemsTable(),
      KeyConditionExpression: 'order_id = :oid',
      ExpressionAttributeValues: { ':oid': orderId },
    });
    if (!items.length) throw new BadRequestException('Order has no items');

    const shipment = await this.shiprocket.createShipment({
      orderId,
      orderDate: new Date().toISOString().slice(0, 10),
      customerName: address.name,
      customerPhone: address.phone,
      deliveryAddress: address.address,
      deliveryCity: address.city,
      deliveryState: address.state,
      deliveryPincode: address.pincode,
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
        customerName: String(user.name || address.name),
        orderId,
        trackingNumber: shipment.awb_number,
        courierName: shipment.courier_name,
        trackingUrl: this.shiprocket.trackingUrl(shipment.awb_number),
      });
    }
    await this.push.sendToToken(String(user?.fcm_token || ''), {
      title: 'Order Shipped',
      body: `Order ${orderId} has been shipped.`,
      data: { order_id: orderId, type: 'order_shipped' },
    });

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
    await this.push.sendToToken(String(user?.fcm_token || ''), {
      title: 'Order Status Update',
      body: `Order ${String(order.id)} is now ${internalStatus.replace(/_/g, ' ')}.`,
      data: { order_id: String(order.id), type: internalStatus },
    });

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
    const user = (await this.dynamo.get(this.usersTable(), { id: String(order.user_id) })) || {};
    const admin = (await this.dynamo.get(this.adminsTable(), { id: String(order.admin_id) })) || {};
    const items = await this.dynamo.query({
      TableName: this.orderItemsTable(),
      KeyConditionExpression: 'order_id = :oid',
      ExpressionAttributeValues: { ':oid': String(order.id) },
    });
    const invoiceId = uuidv4();
    const datePart = now.slice(0, 10).replace(/-/g, '');
    const baseMeta = {
      invoiceId,
      orderId: String(order.id),
      invoiceNumber: `INV-${datePart}-${invoiceId.slice(0, 6).toUpperCase()}`,
      orderDate: String(order.created_at || now),
      issuedAt: now,
      customerName: String(user.name || 'Customer'),
      customerEmail: String(user.email || ''),
      customerPhone: String(user.phone || ''),
      customerGst: String(user.gst_no || ''),
      customerRole: String(user.role || 'customer'),
      shopName: String(admin.shop_name || 'Shop'),
      shopOwner: String(admin.owner_name || ''),
      shopGst: String(admin.gst_no || ''),
      totalAmount: Number(order.total_amount || 0),
      currency: String(order.currency || 'INR'),
      items: items.map((it) => ({
        name: String(it.product_name || 'Item'),
        qty: Number(it.quantity || 1),
        unit: Number(it.unit_price || 0),
        line: Number(it.line_total || 0),
      })),
    };

    const customerPdf = await this.buildInvoicePdf({
      ...baseMeta,
      variant: 'customer',
      title: 'Customer Invoice',
    });
    const uploadOrFallback = async (buf: Buffer, filename: string): Promise<string> => {
      try {
        return await this.s3.upload(buf, 'application/pdf', 'misc');
      } catch {
        return `local-invoice://${filename}`;
      }
    };
    const customerPdfUrl = await uploadOrFallback(
      customerPdf,
      `${baseMeta.invoiceNumber}-customer.pdf`,
    );

    let dealerPdfUrl: string | null = null;
    let gstPdfUrl: string | null = null;
    const attachments: Array<{ filename: string; content: Buffer; contentType: string }> = [
      {
        filename: `${baseMeta.invoiceNumber}-customer.pdf`,
        content: customerPdf,
        contentType: 'application/pdf',
      },
    ];
    if (baseMeta.customerRole === 'dealer') {
      const dealerPdf = await this.buildInvoicePdf({
        ...baseMeta,
        variant: 'dealer',
        title: 'Dealer Invoice',
      });
      const gstPdf = await this.buildInvoicePdf({
        ...baseMeta,
        variant: 'gst',
        title: 'GST Invoice',
      });
      dealerPdfUrl = await uploadOrFallback(
        dealerPdf,
        `${baseMeta.invoiceNumber}-dealer.pdf`,
      );
      gstPdfUrl = await uploadOrFallback(
        gstPdf,
        `${baseMeta.invoiceNumber}-gst.pdf`,
      );
      attachments.push(
        {
          filename: `${baseMeta.invoiceNumber}-dealer.pdf`,
          content: dealerPdf,
          contentType: 'application/pdf',
        },
        {
          filename: `${baseMeta.invoiceNumber}-gst.pdf`,
          content: gstPdf,
          contentType: 'application/pdf',
        },
      );
    }

    await this.dynamo.put(this.invoicesTable(), {
      id: invoiceId,
      order_id: String(order.id),
      group_id: String(order.group_id || ''),
      user_id: String(order.user_id || ''),
      admin_id: String(order.admin_id || ''),
      total_amount: Number(order.total_amount || 0),
      currency: String(order.currency || 'INR'),
      invoice_number: baseMeta.invoiceNumber,
      customer_invoice_url: customerPdfUrl,
      dealer_invoice_url: dealerPdfUrl,
      gst_invoice_url: gstPdfUrl,
      status: 'generated',
      issued_at: now,
      created_at: now,
      updated_at: now,
    });

    if (baseMeta.customerEmail) {
      await this.email.sendInvoiceGenerated(
        baseMeta.customerEmail,
        {
          customerName: baseMeta.customerName,
          orderId: baseMeta.orderId,
          invoiceNumber: baseMeta.invoiceNumber,
          customerInvoiceUrl: customerPdfUrl,
          dealerInvoiceUrl: dealerPdfUrl || undefined,
          gstInvoiceUrl: gstPdfUrl || undefined,
        },
        attachments,
      );
    }
  }

  private async buildInvoicePdf(data: {
    variant: 'customer' | 'dealer' | 'gst';
    title: string;
    invoiceId: string;
    invoiceNumber: string;
    orderId: string;
    orderDate: string;
    issuedAt: string;
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    customerGst: string;
    customerRole: string;
    shopName: string;
    shopOwner: string;
    shopGst: string;
    totalAmount: number;
    currency: string;
    items: Array<{ name: string; qty: number; unit: number; line: number }>;
  }): Promise<Buffer> {
    return new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 40 });
      const buffers: Buffer[] = [];
      doc.on('data', (chunk) => buffers.push(Buffer.from(chunk)));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      doc.fontSize(18).text('E Vision Pvt. Ltd.', { align: 'left' });
      doc.moveDown(0.3);
      doc.fontSize(14).text(data.title);
      doc.moveDown(0.5);
      doc
        .fontSize(10)
        .text(`Invoice No: ${data.invoiceNumber}`)
        .text(`Order ID: ${data.orderId}`)
        .text(`Issued: ${new Date(data.issuedAt).toLocaleString('en-IN')}`)
        .text(`Order Date: ${new Date(data.orderDate).toLocaleString('en-IN')}`);

      doc.moveDown(0.8);
      doc.fontSize(11).text(`Shop: ${data.shopName}`);
      if (data.shopOwner) doc.text(`Shop Owner: ${data.shopOwner}`);
      if (data.variant === 'gst' && data.shopGst) doc.text(`Shop GST: ${data.shopGst}`);
      doc.moveDown(0.6);
      doc.text(`Customer: ${data.customerName}`);
      if (data.customerEmail) doc.text(`Email: ${data.customerEmail}`);
      if (data.customerPhone) doc.text(`Phone: ${data.customerPhone}`);
      if ((data.variant === 'dealer' || data.variant === 'gst') && data.customerGst) {
        doc.text(`Customer GST: ${data.customerGst}`);
      }

      doc.moveDown(0.8);
      doc.fontSize(11).text('Items');
      doc.moveDown(0.3);
      data.items.forEach((it, idx) => {
        doc
          .fontSize(10)
          .text(
            `${idx + 1}. ${it.name} | Qty: ${it.qty} | Unit: ${it.unit.toFixed(2)} | Line: ${it.line.toFixed(2)}`,
          );
      });
      doc.moveDown(1);
      doc
        .fontSize(12)
        .text(`Total (${data.currency}): ${data.totalAmount.toFixed(2)}`, { align: 'right' });
      doc.moveDown(1.4);
      doc
        .fontSize(9)
        .fillColor('gray')
        .text(
          `Generated by E Vision on ${new Date(data.issuedAt).toLocaleString('en-IN')} (${data.variant.toUpperCase()} variant).`,
        );
      doc.end();
    });
  }
}
