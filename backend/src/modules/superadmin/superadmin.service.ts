import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { DynamoService } from '../../common/dynamo/dynamo.service';
import { AdminService } from '../admin/admin.service';
import { ElectricianService } from '../electrician/electrician.service';
import { ReviewsService } from '../reviews/reviews.service';
import { EmailService } from '../emails/email.service';
import { PushService } from '../push/push.service';

const ORDER_OK = new Set([
  'order_received',
  'confirmed',
  'processing',
  'packed',
  'shipped',
  'in_transit',
  'out_for_delivery',
  'delivered',
  'payment_confirmed',
]);

function isOrderCountable(status: string): boolean {
  const s = String(status || '');
  if (s === 'order_cancelled' || s === 'payment_failed') return false;
  return ORDER_OK.has(s) || s.length > 0;
}

@Injectable()
export class SuperadminService {
  private readonly logger = new Logger(SuperadminService.name);

  constructor(
    private dynamo: DynamoService,
    private adminService: AdminService,
    private electricianService: ElectricianService,
    private reviewsService: ReviewsService,
    private emailService: EmailService,
    private pushService: PushService,
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

  async setPlatformCommission(id: string, pct: number) {
    return this.adminService.setPlatformCommission(id, pct);
  }

  async markShopSettled(id: string) {
    return this.adminService.markSettlementComplete(id);
  }

  async getPendingElectricians() {
    return this.electricianService.getPendingElectricians();
  }

  async reviewElectrician(id: string, action: 'approve' | 'reject', reason?: string) {
    return this.electricianService.reviewBySuperadmin(id, action, reason);
  }

  /** Dealers registered but not yet GST-verified (wholesale pricing inactive until verified). */
  async listPendingDealerGst(): Promise<
    Array<{
      id: string;
      name: string;
      email: string;
      phone: string;
      gst_no: string;
      business_name: string | null;
      created_at: string | null;
    }>
  > {
    const users = await this.dynamo.scanAllPages({ TableName: this.dynamo.tableName('users') });
    const out: Array<{
      id: string;
      name: string;
      email: string;
      phone: string;
      gst_no: string;
      business_name: string | null;
      created_at: string | null;
    }> = [];
    for (const u of users) {
      const r = u as Record<string, unknown>;
      if (String(r.role || '') !== 'dealer') continue;
      const gv = r.gst_verified;
      if (gv === true || gv === 'true' || gv === 1 || gv === '1') continue;
      const id = String(r.id || '');
      if (!id) continue;
      out.push({
        id,
        name: String(r.name || ''),
        email: String(r.email || ''),
        phone: String(r.phone || ''),
        gst_no: String(r.gst_no || ''),
        business_name: r.business_name != null ? String(r.business_name) : null,
        created_at: r.created_at != null ? String(r.created_at) : null,
      });
    }
    return out.sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')));
  }

  async listReviews() {
    return this.reviewsService.listAllForSuperadmin();
  }

  async deleteReview(id: string) {
    return this.reviewsService.deleteReviewAsSuperadmin(id);
  }

  async getAnalytics() {
    const [admins, users, emailLogs, orders, electricians] = await Promise.all([
      this.dynamo.scan({ TableName: this.dynamo.tableName('admins') }),
      this.dynamo.scan({ TableName: this.dynamo.tableName('users') }),
      this.dynamo.scan({ TableName: this.dynamo.tableName('email_logs') }),
      this.dynamo.scan({ TableName: this.dynamo.tableName('orders') }),
      this.dynamo.scan({ TableName: this.dynamo.tableName('electricians') }),
    ]);

    const adminStats = {
      total: admins.length,
      pending: admins.filter((a) => a.status === 'pending').length,
      approved: admins.filter((a) => a.status === 'approved').length,
      rejected: admins.filter((a) => a.status === 'rejected').length,
      suspended: admins.filter((a) => a.status === 'suspended').length,
    };

    const userStats = {
      total: users.length,
      customers: users.filter((u) => u.role === 'customer').length,
      dealers: users.filter((u) => u.role === 'dealer').length,
      electricians: users.filter((u) => u.role === 'electrician').length,
    };

    const emailStats = {
      total: emailLogs.length,
      sent: emailLogs.filter((e) => e.status === 'sent').length,
      failed: emailLogs.filter((e) => e.status === 'failed').length,
    };

    const adminById = new Map(admins.map((a) => [String(a.id), a]));
    const userById = new Map(users.map((u) => [String(u.id), u]));

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayMs = todayStart.getTime();

    let platformRevenue = 0;
    let ordersToday = 0;
    const revenueByAdmin: Record<string, number> = {};
    const orderCountByAdmin: Record<string, number> = {};

    for (const o of orders) {
      if (!isOrderCountable(String(o.status))) continue;
      const amt = Number(o.total_amount || 0);
      platformRevenue += amt;
      const created = new Date(String(o.created_at || 0)).getTime();
      if (created >= todayMs) ordersToday += 1;
      const aid = String(o.admin_id || '');
      if (aid) {
        revenueByAdmin[aid] = (revenueByAdmin[aid] || 0) + amt;
        orderCountByAdmin[aid] = (orderCountByAdmin[aid] || 0) + 1;
      }
    }

    const revenue_by_shop = Object.entries(revenueByAdmin)
      .map(([admin_id, amount]) => ({
        admin_id,
        shop_name: String(adminById.get(admin_id)?.shop_name || 'Shop'),
        amount,
        order_count: orderCountByAdmin[admin_id] || 0,
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 12);

    const recent_orders = [...orders]
      .filter((o) => isOrderCountable(String(o.status)))
      .sort(
        (a, b) =>
          new Date(String(b.created_at || 0)).getTime() -
          new Date(String(a.created_at || 0)).getTime(),
      )
      .slice(0, 12)
      .map((o) => {
        const u = userById.get(String(o.user_id));
        const a = adminById.get(String(o.admin_id));
        return {
          id: String(o.id),
          group_id: String(o.group_id || ''),
          customer: String(u?.name || u?.email || '—'),
          shop: String(a?.shop_name || '—'),
          amount: Number(o.total_amount || 0),
          status: String(o.status || ''),
          created_at: String(o.created_at || ''),
        };
      });

    const recent_emails = [...emailLogs]
      .sort(
        (a, b) =>
          new Date(String(b.sent_at || 0)).getTime() - new Date(String(a.sent_at || 0)).getTime(),
      )
      .slice(0, 12)
      .map((e) => ({
        trigger: String(e.trigger_event || ''),
        recipient: String(e.to_email || ''),
        to_role: String(e.to_role || ''),
        status: String(e.status || ''),
        time: String(e.sent_at || ''),
      }));

    const active_electricians = electricians.filter((e) => String(e.status) === 'approved').length;

    return {
      admins: adminStats,
      users: userStats,
      emails: emailStats,
      orders: {
        platform_revenue: platformRevenue,
        orders_today: ordersToday,
        total_count: orders.filter((o) => isOrderCountable(String(o.status))).length,
      },
      revenue_by_shop,
      recent_orders,
      recent_emails,
      active_electricians,
      generated_at: new Date().toISOString(),
    };
  }

  async getEmailLogs(filters?: {
    event?: string;
    status?: string;
    to_role?: string;
    date_from?: string;
    date_to?: string;
  }) {
    let logs: Record<string, unknown>[];
    if (filters?.event) {
      logs = await this.dynamo.query({
        TableName: this.dynamo.tableName('email_logs'),
        IndexName: 'EventIndex',
        KeyConditionExpression: 'trigger_event = :event',
        ExpressionAttributeValues: { ':event': filters.event },
        ScanIndexForward: false,
      });
    } else {
      logs = await this.dynamo.scan({ TableName: this.dynamo.tableName('email_logs') });
    }

    let rows = [...logs].sort(
      (a, b) =>
        new Date(String(b.sent_at || 0)).getTime() - new Date(String(a.sent_at || 0)).getTime(),
    );

    if (filters?.status) {
      rows = rows.filter((e) => String(e.status) === filters.status);
    }
    if (filters?.to_role) {
      rows = rows.filter((e) => String(e.to_role) === filters.to_role);
    }
    if (filters?.date_from) {
      const from = new Date(filters.date_from).getTime();
      rows = rows.filter((e) => new Date(String(e.sent_at || 0)).getTime() >= from);
    }
    if (filters?.date_to) {
      const to = new Date(filters.date_to).getTime();
      rows = rows.filter((e) => new Date(String(e.sent_at || 0)).getTime() <= to);
    }

    return rows.map((e) => ({
      id: String(e.id),
      trigger_event: String(e.trigger_event || ''),
      to_email: String(e.to_email || ''),
      to_role: String(e.to_role || ''),
      subject: String(e.subject || ''),
      status: String(e.status || ''),
      error_message: e.error_message ? String(e.error_message) : null,
      sent_at: String(e.sent_at || ''),
    }));
  }

  async getSettlements() {
    const [admins, orders] = await Promise.all([
      this.dynamo.scan({ TableName: this.dynamo.tableName('admins') }),
      this.dynamo.scan({ TableName: this.dynamo.tableName('orders') }),
    ]);

    const validOrders = orders.filter((o) => isOrderCountable(String(o.status)));
    const adminById = new Map(admins.map((a) => [String(a.id), a]));

    const total_collected = validOrders.reduce((s, o) => s + Number(o.total_amount || 0), 0);
    const platform_commission_earned = validOrders.reduce((sum, o) => {
      const a = adminById.get(String(o.admin_id));
      const pct = Number(a?.platform_commission_pct ?? 10);
      return sum + (Number(o.total_amount || 0) * pct) / 100;
    }, 0);
    const lifetime_net_to_shops = total_collected - platform_commission_earned;

    const shopRows = admins
      .filter((a) => a.status === 'approved' || a.status === 'suspended')
      .map((admin) => {
        const id = String(admin.id);
        const pct = Number(admin.platform_commission_pct ?? 10);
        const settledAfter = admin.last_settlement_at ? new Date(String(admin.last_settlement_at)).getTime() : 0;
        const periodOrders = validOrders.filter((o) => {
          if (String(o.admin_id) !== id) return false;
          const t = new Date(String(o.created_at || 0)).getTime();
          return t > settledAfter;
        });
        const orders_this_period = periodOrders.length;
        const gross = periodOrders.reduce((s, o) => s + Number(o.total_amount || 0), 0);
        const commission = Math.round(gross * (pct / 100) * 100) / 100;
        const net_payable = Math.round((gross - commission) * 100) / 100;

        return {
          admin_id: id,
          shop_name: String(admin.shop_name || 'Shop'),
          orders_this_period,
          gross_amount: Math.round(gross * 100) / 100,
          commission_deducted: commission,
          net_payable,
          platform_commission_pct: pct,
          last_settled_at: admin.last_settlement_at ? String(admin.last_settlement_at) : null,
        };
      });

    const pending_to_settle = shopRows.reduce((s, r) => s + r.net_payable, 0);
    const total_settled = Math.max(0, lifetime_net_to_shops - pending_to_settle);

    return {
      summary: {
        total_collected: Math.round(total_collected * 100) / 100,
        total_settled: Math.round(total_settled * 100) / 100,
        pending_to_settle: Math.round(pending_to_settle * 100) / 100,
        platform_commission_earned: Math.round(platform_commission_earned * 100) / 100,
      },
      shops: shopRows,
    };
  }

  async verifyDealerGst(userId: string): Promise<{ message: string; user_id: string }> {
    const u = await this.dynamo.get(this.dynamo.tableName('users'), { id: userId });
    if (!u) throw new NotFoundException('User not found');
    if (String((u as Record<string, unknown>).role) !== 'dealer') {
      throw new BadRequestException('Not a dealer account');
    }
    const now = new Date().toISOString();
    await this.dynamo.update(this.dynamo.tableName('users'), { id: userId }, {
      gst_verified: true,
      gst_verified_at: now,
      updated_at: now,
    });

    const rec = u as Record<string, unknown>;
    const dealerName = String(rec.name || 'there').trim() || 'there';
    const dealerEmail = String(rec.email || '').trim();
    if (dealerEmail) {
      try {
        await this.emailService.sendDealerGstVerified(dealerEmail, { name: dealerName });
      } catch (e) {
        this.logger.warn(`Dealer GST verified email failed: ${(e as Error).message}`);
      }
    }
    await this.pushService.sendToToken(String(rec.fcm_token || '').trim() || null, {
      title: 'Dealer pricing is active',
      body: 'Your GST is verified. Browse the full catalogue at wholesale prices and complete checkout as a dealer.',
      data: { type: 'dealer_gst_verified' },
    });

    return { message: 'Dealer GST verified; dealer pricing is now active.', user_id: userId };
  }
}
