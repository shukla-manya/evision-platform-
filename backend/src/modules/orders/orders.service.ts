import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DynamoService } from '../../common/dynamo/dynamo.service';
import { EmailService } from '../emails/email.service';

@Injectable()
export class OrdersService {
  constructor(
    private dynamo: DynamoService,
    private email: EmailService,
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
}
