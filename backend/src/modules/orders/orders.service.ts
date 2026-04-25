import { Injectable } from '@nestjs/common';
import { DynamoService } from '../../common/dynamo/dynamo.service';

@Injectable()
export class OrdersService {
  constructor(private dynamo: DynamoService) {}

  private ordersTable() {
    return this.dynamo.tableName('orders');
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
}
