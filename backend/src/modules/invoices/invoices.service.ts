import { Injectable } from '@nestjs/common';
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
}
