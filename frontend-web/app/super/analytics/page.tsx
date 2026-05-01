'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Users,
  Mail,
  Loader2,
  ShoppingBag,
  UserCog,
  CalendarClock,
  Package,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { superadminApi } from '@/lib/api';
import { SuperadminShell } from '@/components/superadmin/SuperadminShell';
import {
  type SuperadminAnalyticsSnapshot,
  formatSuperadminCompactINR,
  formatSuperadminINR,
  superadminOrderStatusTone,
} from '@/lib/superadmin-analytics';

export default function SuperadminAnalyticsPage() {
  const [analytics, setAnalytics] = useState<SuperadminAnalyticsSnapshot | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    superadminApi
      .getAnalytics()
      .then((r) => setAnalytics(r.data as SuperadminAnalyticsSnapshot))
      .catch(() => toast.error('Failed to load analytics'))
      .finally(() => setLoading(false));
  }, []);

  const recentOrders = analytics?.recent_orders ?? [];
  const recentEmails = analytics?.recent_emails ?? [];
  const platformRevenue = analytics?.orders?.platform_revenue ?? 0;
  const ordersToday = analytics?.orders?.orders_today ?? 0;
  const totalOrders = analytics?.orders?.total_count ?? 0;
  const activeElectricians = analytics?.active_electricians ?? analytics?.users?.electricians ?? 0;

  return (
    <SuperadminShell>
      <main className="w-full min-w-0">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-ev-text mb-1">Platform analytics</h1>
            <p className="text-ev-muted text-sm">
              Revenue, orders, and user snapshot from DynamoDB
              {analytics?.generated_at ? ` · ${new Date(analytics.generated_at).toLocaleString('en-IN')}` : ''}
            </p>
          </div>
          <Link href="/super/dashboard" className="ev-btn-secondary text-sm py-2 px-4 self-start">
            Back to overview
          </Link>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-ev-muted py-16">
            <Loader2 className="animate-spin text-ev-primary" size={24} />
            Loading…
          </div>
        ) : analytics ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 mb-10">
              <div className="ev-card p-5 border-ev-border">
                <p className="text-ev-muted text-sm font-medium">Total platform revenue</p>
                <p className="text-2xl font-bold text-ev-text mt-2">{formatSuperadminCompactINR(platformRevenue)}</p>
                <p className="text-ev-subtle text-xs mt-2">Countable shop orders (excl. cancelled / failed payment)</p>
              </div>
              <div className="ev-card p-5 border-ev-border">
                <p className="text-ev-muted text-sm font-medium flex items-center gap-2">
                  <CalendarClock size={14} /> Orders today
                </p>
                <p className="text-2xl font-bold text-ev-text mt-2">{ordersToday}</p>
                <p className="text-ev-subtle text-xs mt-2">Order rows created since midnight</p>
              </div>
              <div className="ev-card p-5 border-ev-border">
                <p className="text-ev-muted text-sm font-medium flex items-center gap-2">
                  <Package size={14} /> Total orders
                </p>
                <p className="text-2xl font-bold text-ev-text mt-2">{totalOrders}</p>
                <p className="text-ev-subtle text-xs mt-2">All-time countable orders</p>
              </div>
              <div className="ev-card p-5 border-ev-border">
                <p className="text-ev-muted text-sm font-medium flex items-center gap-2">
                  <UserCog size={14} /> Active technicians
                </p>
                <p className="text-2xl font-bold text-ev-text mt-2">{activeElectricians}</p>
                <p className="text-ev-subtle text-xs mt-2">Approved technician profiles</p>
              </div>
              <div className="ev-card p-5 border-ev-border">
                <p className="text-ev-muted text-sm font-medium">Total users</p>
                <p className="text-2xl font-bold text-ev-text mt-2">{analytics.users.total}</p>
                <p className="text-ev-muted text-sm mt-1">
                  {analytics.users.customers} customers · {analytics.users.dealers} dealers
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 min-[420px]:grid-cols-2 gap-4 mb-10">
              {[
                { label: 'Emails sent', value: analytics.emails.sent, icon: Mail, color: 'text-ev-success', bg: 'bg-ev-success/10' },
                {
                  label: 'Email failures',
                  value: analytics.emails.failed,
                  icon: Mail,
                  color: analytics.emails.failed > 0 ? 'text-ev-error' : 'text-ev-muted',
                  bg: analytics.emails.failed > 0 ? 'bg-ev-error/10' : 'bg-ev-surface2',
                },
              ].map(({ label, value, icon: Icon, color, bg }) => (
                <div key={label} className="ev-card p-6">
                  <div className={`w-10 h-10 ${bg} rounded-xl flex items-center justify-center mb-3`}>
                    <Icon size={20} className={color} />
                  </div>
                  <p className="text-3xl font-bold text-ev-text">{value}</p>
                  <p className="text-ev-muted text-sm mt-1">{label}</p>
                </div>
              ))}
            </div>

            <div className="mb-10">
              <div className="ev-card p-6 max-w-xl">
                <h3 className="text-ev-text font-semibold mb-4 flex items-center gap-2">
                  <Users size={16} className="text-ev-primary" />
                  Users & email
                </h3>
                {[
                  { label: 'Customers', val: analytics.users.customers, color: 'bg-ev-primary' },
                  { label: 'Dealers', val: analytics.users.dealers, color: 'bg-ev-accent' },
                ].map(({ label, val, color }) => (
                  <div key={label} className="flex items-center justify-between py-2 border-b border-ev-border last:border-0">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${color}`} />
                      <span className="text-ev-muted text-sm">{label}</span>
                    </div>
                    <span className="text-ev-text font-semibold">{val}</span>
                  </div>
                ))}
                <div className="flex items-center justify-between py-2 mt-2">
                  <span className="text-ev-muted text-sm">Total email log rows</span>
                  <span className="text-ev-text font-semibold">{analytics.emails.total}</span>
                </div>
              </div>
            </div>

            <div className="mb-10">
              <section>
                <h2 className="text-lg font-bold text-ev-text flex items-center gap-2 mb-4">
                  <ShoppingBag size={18} className="text-ev-primary" />
                  Recent orders
                </h2>
                <div className="ev-card overflow-hidden border-ev-border">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-ev-border bg-ev-surface2 text-left text-ev-muted">
                          <th className="px-4 py-3 font-semibold">Order</th>
                          <th className="px-4 py-3 font-semibold">Customer</th>
                          <th className="px-4 py-3 font-semibold">Shop</th>
                          <th className="px-4 py-3 font-semibold">Amount</th>
                          <th className="px-4 py-3 font-semibold">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recentOrders.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="px-4 py-10 text-center text-ev-muted">
                              No orders yet
                            </td>
                          </tr>
                        ) : (
                          recentOrders.map((o) => {
                            const tone = superadminOrderStatusTone(o.status);
                            return (
                              <tr key={o.id} className="border-b border-ev-border last:border-0">
                                <td className="px-4 py-3 font-mono text-xs text-ev-text">#{o.id.slice(0, 8)}</td>
                                <td className="px-4 py-3 text-ev-text">{o.customer}</td>
                                <td className="px-4 py-3 text-ev-muted">{o.shop}</td>
                                <td className="px-4 py-3 font-medium text-ev-text">{formatSuperadminINR(o.amount)}</td>
                                <td className="px-4 py-3">
                                  <span
                                    className={
                                      tone === 'success'
                                        ? 'text-ev-success font-medium'
                                        : tone === 'error'
                                          ? 'text-ev-error font-medium'
                                          : tone === 'pending'
                                            ? 'text-ev-warning font-medium'
                                            : 'text-ev-muted font-medium'
                                    }
                                  >
                                    {o.status}
                                  </span>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </section>
            </div>

            <section className="mb-10">
              <h2 className="text-lg font-bold text-ev-text mb-4 flex items-center gap-2">
                <Mail size={18} className="text-ev-primary" />
                Recent emails
              </h2>
              <div className="ev-card overflow-hidden border-ev-border">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-ev-border bg-ev-surface2 text-left text-ev-muted">
                        <th className="px-4 py-3 font-semibold">Trigger</th>
                        <th className="px-4 py-3 font-semibold">Recipient</th>
                        <th className="px-4 py-3 font-semibold">Role</th>
                        <th className="px-4 py-3 font-semibold">Status</th>
                        <th className="px-4 py-3 font-semibold">Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentEmails.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-4 py-10 text-center text-ev-muted">
                            No email history in snapshot
                          </td>
                        </tr>
                      ) : (
                        recentEmails.map((e, i) => (
                          <tr key={`${e.time}-${i}`} className="border-b border-ev-border last:border-0">
                            <td className="px-4 py-3 font-mono text-xs text-ev-text">{e.trigger}</td>
                            <td className="px-4 py-3 text-ev-muted truncate max-w-[200px]" title={e.recipient}>
                              {e.recipient}
                            </td>
                            <td className="px-4 py-3 text-ev-muted">{e.to_role}</td>
                            <td className="px-4 py-3">
                              <span
                                className={
                                  e.status === 'sent' ? 'text-ev-success font-medium' : 'text-ev-error font-medium'
                                }
                              >
                                {e.status}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-ev-muted text-xs whitespace-nowrap">
                              {e.time ? new Date(e.time).toLocaleString('en-IN') : '—'}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>

            <div className="flex flex-wrap gap-3">
              <Link href="/super/settlements" className="ev-btn-secondary text-sm py-2.5 px-4">
                Settlements
              </Link>
              <Link href="/super/email-logs" className="ev-btn-secondary text-sm py-2.5 px-4">
                Email logs
              </Link>
              <Link href="/super/reviews" className="ev-btn-secondary text-sm py-2.5 px-4">
                Reviews
              </Link>
            </div>
          </>
        ) : null}
      </main>
    </SuperadminShell>
  );
}
