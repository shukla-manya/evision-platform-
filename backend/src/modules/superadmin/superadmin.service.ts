import { Injectable, Logger } from '@nestjs/common';
import { DynamoService } from '../../common/dynamo/dynamo.service';
import { AdminService } from '../admin/admin.service';

@Injectable()
export class SuperadminService {
  private readonly logger = new Logger(SuperadminService.name);

  constructor(
    private dynamo: DynamoService,
    private adminService: AdminService,
  ) {}

  async getPendingAdmins() {
    return this.adminService.getPendingAdmins();
  }

  async getAllAdmins() {
    return this.adminService.getAllAdmins();
  }

  async approveAdmin(id: string) {
    return this.adminService.approve(id);
  }

  async rejectAdmin(id: string, reason?: string) {
    return this.adminService.reject(id, reason);
  }

  async suspendAdmin(id: string) {
    return this.adminService.suspend(id);
  }

  async getAnalytics() {
    const [admins, users, emailLogs] = await Promise.all([
      this.dynamo.scan({ TableName: this.dynamo.tableName('admins') }),
      this.dynamo.scan({ TableName: this.dynamo.tableName('users') }),
      this.dynamo.scan({ TableName: this.dynamo.tableName('email_logs') }),
    ]);

    const adminStats = {
      total: admins.length,
      pending: admins.filter(a => a.status === 'pending').length,
      approved: admins.filter(a => a.status === 'approved').length,
      rejected: admins.filter(a => a.status === 'rejected').length,
      suspended: admins.filter(a => a.status === 'suspended').length,
    };

    const userStats = {
      total: users.length,
      customers: users.filter(u => u.role === 'customer').length,
      dealers: users.filter(u => u.role === 'dealer').length,
    };

    const emailStats = {
      total: emailLogs.length,
      sent: emailLogs.filter(e => e.status === 'sent').length,
      failed: emailLogs.filter(e => e.status === 'failed').length,
    };

    return {
      admins: adminStats,
      users: userStats,
      emails: emailStats,
      generated_at: new Date().toISOString(),
    };
  }

  async getEmailLogs(triggerEvent?: string) {
    if (triggerEvent) {
      return this.dynamo.query({
        TableName: this.dynamo.tableName('email_logs'),
        IndexName: 'EventIndex',
        KeyConditionExpression: 'trigger_event = :event',
        ExpressionAttributeValues: { ':event': triggerEvent },
        ScanIndexForward: false,
      });
    }
    const logs = await this.dynamo.scan({ TableName: this.dynamo.tableName('email_logs') });
    return logs.sort((a, b) => new Date(b.sent_at).getTime() - new Date(a.sent_at).getTime());
  }
}
