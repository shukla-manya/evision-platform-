import { Injectable, NotFoundException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { DynamoService } from '../../common/dynamo/dynamo.service';

@Injectable()
export class InvoicesService {
  constructor(private dynamo: DynamoService) {}

  private ordersTable() {
    return this.dynamo.tableName('orders');
  }

  private invoicesTable() {
    return this.dynamo.tableName('invoices');
  }

  /** Invoices whose parent order belongs to this admin (shop-scoped). */
  async listForAdmin(adminId: string): Promise<Record<string, unknown>[]> {
    const orders = await this.dynamo.query({
      TableName: this.ordersTable(),
      IndexName: 'AdminIndex',
      KeyConditionExpression: 'admin_id = :aid',
      ExpressionAttributeValues: { ':aid': adminId },
    });
    const orderIds = orders.map((o) => o.id as string).filter(Boolean);
    if (!orderIds.length) return [];

    const invoiceLists = await Promise.all(
      orderIds.map((orderId) =>
        this.dynamo.query({
          TableName: this.invoicesTable(),
          IndexName: 'OrderIndex',
          KeyConditionExpression: 'order_id = :oid',
          ExpressionAttributeValues: { ':oid': orderId },
        }),
      ),
    );
    const flat = invoiceLists.flat();
    return flat.sort(
      (a, b) =>
        new Date(String(b.created_at || b.issued_at || 0)).getTime() -
        new Date(String(a.created_at || a.issued_at || 0)).getTime(),
    );
  }

  async generateForOrder(orderId: string): Promise<Record<string, unknown>> {
    const existing = await this.dynamo.query({
      TableName: this.invoicesTable(),
      IndexName: 'OrderIndex',
      KeyConditionExpression: 'order_id = :oid',
      ExpressionAttributeValues: { ':oid': orderId },
    });
    if (existing.length > 0) return existing[0] as Record<string, unknown>;

    const order = await this.dynamo.get(this.ordersTable(), { id: orderId });
    if (!order) throw new NotFoundException(`Order ${orderId} not found`);

    const now = new Date().toISOString();
    const invoice: Record<string, unknown> = {
      id: uuidv4(),
      order_id: orderId,
      admin_id: String(order.admin_id || ''),
      user_id: String(order.user_id || ''),
      group_id: String(order.group_id || ''),
      total_amount: Number(order.total_amount || 0),
      currency: String(order.currency || 'INR'),
      status: 'issued',
      issued_at: now,
      created_at: now,
      updated_at: now,
    };
    await this.dynamo.put(this.invoicesTable(), invoice);
    return invoice;
  }
}
