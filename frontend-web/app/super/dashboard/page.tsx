'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Store,
  ShoppingBag,
  Mail,
  Loader2,
  Inbox,
  UserCog,
  ClipboardCheck,
  Users,
  Landmark,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { superadminApi } from '@/lib/api';
import { getApiErrorMessage } from '@/lib/api-errors';
import { SuperadminShell } from '@/components/superadmin/SuperadminShell';
import { getToken, parseJwt } from '@/lib/auth';
import {
  type SuperadminAnalyticsSnapshot,
  formatSuperadminCompactINR,
  formatSuperadminINR,
  superadminOrderStatusTone,
} from '@/lib/superadmin-analytics';
import { personalizedTimeGreetingIst } from '@/lib/time-greeting';

type AdminRow = { id: string; shop_name?: string; owner_name?: string; email?: string; created_at?: string };
type ElectricianRow = { id: string; name?: string; email?: string; created_at?: string };

function displayNameFromEmail(email: string) {
  if (!email) return 'there';
  const local = email.split('@')[0] || '';
  return local
    .split(/[._-]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

function initialsFromEmail(email: string) {
  const name = displayNameFromEmail(email);
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  if (parts.length === 1 && parts[0].length >= 2) return parts[0].slice(0, 2).toUpperCase();
  return 'SA';
}

export default function SuperDashboardPage() {
  const [analytics, setAnalytics] = useState<SuperadminAnalyticsSnapshot | null>(null);
  const [pendingAdmins, setPendingAdmins] = useState<AdminRow[]>([]);
  const [pendingElectricians, setPendingElectricians] = useState<ElectricianRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<{ id: string; type: 'Admin' | 'Technician' } | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const token = typeof window !== 'undefined' ? getToken() : undefined;
  const payload = token ? parseJwt(token) : null;
  const email = String(payload?.email || '');
  const greetName = displayNameFromEmail(email);
  const initials = initialsFromEmail(email);

  const todayLabel = useMemo(
    () =>
      new Date().toLocaleDateString('en-IN', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }),
    [],
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [anRes, paRes, peRes] = await Promise.all([
        superadminApi.getAnalytics(),
        superadminApi.getPendingAdmins(),
        superadminApi.getPendingElectricians(),
      ]);
      setAnalytics(anRes.data as SuperadminAnalyticsSnapshot);
      setPendingAdmins(Array.isArray(paRes.data) ? (paRes.data as AdminRow[]) : []);
      setPendingElectricians(Array.isArray(peRes.data) ? (peRes.data as ElectricianRow[]) : []);
    } catch {
      toast.error('Could not load overview');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const pendingTotal = pendingAdmins.length + pendingElectricians.length;

  const approvalPreview = useMemo(() => {
    const rows: { id: string; name: string; type: 'Admin' | 'Technician'; submitted: string }[] = [];
    pendingAdmins.forEach((a) =>
      rows.push({
        id: a.id,
        name: String(a.shop_name || a.owner_name || a.email || 'Shop'),
        type: 'Admin',
        submitted: a.created_at ? new Date(a.created_at).toLocaleDateString('en-IN') : '—',
      }),
    );
    pendingElectricians.forEach((e) =>
      rows.push({
        id: e.id,
        name: String(e.name || e.email || 'Technician'),
        type: 'Technician',
        submitted: e.created_at ? new Date(e.created_at).toLocaleDateString('en-IN') : '—',
      }),
    );
    return rows.slice(0, 8);
  }, [pendingAdmins, pendingElectricians]);

  async function approveRow(row: { id: string; type: 'Admin' | 'Technician' }) {
    setActionId(row.id);
    try {
      if (row.type === 'Admin') {
        await superadminApi.approveAdmin(row.id);
        toast.success('Shop admin approved');
      } else {
        await superadminApi.reviewElectrician(row.id, { action: 'approve' });
        toast.success('Technician approved');
      }
      await load();
    } catch (e: unknown) {
      toast.error(getApiErrorMessage(e, 'Action failed'));
    } finally {
      setActionId(null);
    }
  }

  async function confirmReject() {
    if (!rejecting || !rejectReason.trim()) {
      toast.error('Enter a rejection reason');
      return;
    }
    setActionId(rejecting.id);
    try {
      if (rejecting.type === 'Admin') {
        await superadminApi.rejectAdmin(rejecting.id, rejectReason.trim());
        toast.success('Registration rejected');
      } else {
        await superadminApi.reviewElectrician(rejecting.id, { action: 'reject', reason: rejectReason.trim() });
        toast.success('Registration rejected');
      }
      setRejecting(null);
      setRejectReason('');
      await load();
    } catch (e: unknown) {
      toast.error(getApiErrorMessage(e, 'Reject failed'));
    } finally {
      setActionId(null);
    }
  }

  const revenueByShop = analytics?.revenue_by_shop?.length ? analytics.revenue_by_shop : [];
  const maxShopRev = revenueByShop.length > 0 ? Math.max(...revenueByShop.map((s) => s.amount), 1) : 1;
  const recentOrders = analytics?.recent_orders ?? [];
  const recentEmails = analytics?.recent_emails ?? [];
  const platformRevenue = analytics?.orders?.platform_revenue ?? 0;
  const ordersToday = analytics?.orders?.orders_today ?? 0;
  const activeElectricians = analytics?.active_electricians ?? analytics?.users?.electricians ?? 0;

  return (
    <SuperadminShell>
      <main className="w-full min-w-0 max-w-6xl">
        {loading ? (
          <div className="flex items-center gap-2 text-ev-muted py-24">
            <Loader2 className="animate-spin text-ev-primary" size={24} />
            Loading overview…
          </div>
        ) : (
          <>
            <header className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6 mb-10">
              <div>
                <p className="text-ev-muted text-sm mb-1">
                  <span className="text-ev-text font-semibold">{personalizedTimeGreetingIst(greetName)}</span>
                </p>
                <h1 className="text-2xl sm:text-3xl font-bold text-ev-text tracking-tight">Dashboard — Overview</h1>
                <p className="text-ev-muted text-sm mt-1">{todayLabel}</p>
              </div>
              <div
                className="w-12 h-12 rounded-2xl bg-ev-indigo text-white font-bold text-sm flex items-center justify-center shrink-0 shadow-ev-md border border-white/10"
                aria-hidden
              >
                {initials}
              </div>
            </header>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 mb-10">
              <div className="ev-card p-5 border-ev-border">
                <p className="text-ev-muted text-sm font-medium">Total platform revenue</p>
                <p className="text-2xl font-bold text-ev-text mt-2">{formatSuperadminCompactINR(platformRevenue)}</p>
                <p className="text-ev-subtle text-xs mt-2">From payable orders across shops</p>
              </div>
              <div className="ev-card p-5 border-ev-border">
                <p className="text-ev-muted text-sm font-medium">Orders today</p>
                <p className="text-2xl font-bold text-ev-text mt-2">{ordersToday}</p>
                <p className="text-ev-subtle text-xs mt-2">Shop order rows created today</p>
              </div>
              <div className="ev-card p-5 border-ev-border">
                <p className="text-ev-muted text-sm font-medium">Active shops</p>
                <p className="text-2xl font-bold text-ev-text mt-2">{analytics?.admins.approved ?? '—'}</p>
                <p className="text-ev-muted text-sm mt-1">Approved registrations</p>
              </div>
              <div className="ev-card p-5 border-ev-border border-ev-warning/25 bg-ev-warning/5">
                <p className="text-ev-muted text-sm font-medium">Pending approvals</p>
                <p className="text-2xl font-bold text-ev-text mt-2">{pendingTotal}</p>
                <p className="text-ev-muted text-sm mt-1">
                  {pendingAdmins.length} shop · {pendingElectricians.length} technician
                </p>
              </div>
              <div className="ev-card p-5 border-ev-border">
                <p className="text-ev-muted text-sm font-medium">Active technicians</p>
                <p className="text-2xl font-bold text-ev-text mt-2">{activeElectricians}</p>
                <p className="text-ev-subtle text-xs mt-2">Approved technician accounts</p>
              </div>
              <div className="ev-card p-5 border-ev-border">
                <p className="text-ev-muted text-sm font-medium">Total users</p>
                <p className="text-2xl font-bold text-ev-text mt-2">{analytics?.users.total ?? '—'}</p>
                <p className="text-ev-muted text-sm mt-1">Rows in users table (customers + dealers + other roles)</p>
              </div>
              <div className="ev-card p-5 border-ev-border">
                <p className="text-ev-muted text-sm font-medium flex items-center gap-2">
                  <Users size={16} className="text-ev-primary shrink-0" aria-hidden />
                  Customers
                </p>
                <p className="text-2xl font-bold text-ev-text mt-2">{analytics?.users.customers ?? '—'}</p>
                <p className="text-ev-subtle text-xs mt-2">Registered accounts with role customer</p>
              </div>
              <div className="ev-card p-5 border-ev-border">
                <p className="text-ev-muted text-sm font-medium flex items-center gap-2">
                  <Landmark size={16} className="text-ev-accent shrink-0" aria-hidden />
                  Dealers
                </p>
                <p className="text-2xl font-bold text-ev-text mt-2">{analytics?.users.dealers ?? '—'}</p>
                <p className="text-ev-subtle text-xs mt-2">Registered accounts with role dealer</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-10">
              <Link
                href="/super/shop-registrations"
                className="ev-btn-secondary text-sm py-3 px-4 inline-flex items-center justify-center gap-2 font-semibold w-full"
              >
                <Inbox size={18} className="text-ev-primary shrink-0" aria-hidden />
                Shop queue
              </Link>
              <Link
                href="/super/technicians"
                className="ev-btn-secondary text-sm py-3 px-4 inline-flex items-center justify-center gap-2 font-semibold w-full"
              >
                <UserCog size={18} className="text-ev-primary shrink-0" aria-hidden />
                Technicians
              </Link>
              <Link
                href="/super/dealers"
                className="ev-btn-secondary text-sm py-3 px-4 inline-flex items-center justify-center gap-2 font-semibold w-full"
              >
                <ClipboardCheck size={18} className="text-ev-primary shrink-0" aria-hidden />
                Dealer GST
              </Link>
            </div>

            <section className="mb-10">
              <div className="mb-4">
                <h2 className="text-lg font-bold text-ev-text">Pending approvals</h2>
              </div>
              <div className="ev-card overflow-hidden border-ev-border">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-ev-border bg-ev-surface2 text-left text-ev-muted">
                        <th className="px-4 py-3 font-semibold">Name</th>
                        <th className="px-4 py-3 font-semibold">Type</th>
                        <th className="px-4 py-3 font-semibold">Submitted</th>
                        <th className="px-4 py-3 font-semibold text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {approvalPreview.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-4 py-10 text-center text-ev-muted">
                            No pending approvals
                          </td>
                        </tr>
                      ) : (
                        approvalPreview.map((row) => (
                          <tr key={`${row.type}-${row.id}`} className="border-b border-ev-border last:border-0">
                            <td className="px-4 py-3 font-medium text-ev-text">{row.name}</td>
                            <td className="px-4 py-3 text-ev-muted">{row.type}</td>
                            <td className="px-4 py-3 text-ev-muted">{row.submitted}</td>
                            <td className="px-4 py-3 text-right space-x-2 whitespace-nowrap">
                              <button
                                type="button"
                                disabled={actionId === row.id}
                                onClick={() => void approveRow(row)}
                                className="text-sm font-semibold text-emerald-600 hover:text-emerald-500 disabled:opacity-50"
                              >
                                Approve
                              </button>
                              <button
                                type="button"
                                disabled={actionId === row.id}
                                onClick={() => {
                                  setRejecting({ id: row.id, type: row.type });
                                  setRejectReason('');
                                }}
                                className="text-sm font-semibold text-red-600 hover:text-red-500 disabled:opacity-50"
                              >
                                Reject
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>

            {rejecting ? (
              <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/50">
                <div className="ev-card max-w-md w-full p-6 space-y-4">
                  <h3 className="font-bold text-ev-text">Reject {rejecting.type === 'Admin' ? 'shop admin' : 'technician'}</h3>
                  <label className="block text-sm text-ev-muted">Reason for rejection</label>
                  <textarea
                    className="ev-input min-h-[100px] py-3"
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="e.g. GST document unreadable — please resubmit"
                  />
                  <div className="flex gap-2 justify-end">
                    <button type="button" className="ev-btn-secondary text-sm py-2 px-4" onClick={() => setRejecting(null)}>
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="text-sm py-2 px-4 rounded-xl bg-red-600 text-white font-medium hover:bg-red-500 disabled:opacity-50"
                      disabled={!rejectReason.trim() || actionId === rejecting.id}
                      onClick={() => void confirmReject()}
                    >
                      Send rejection
                    </button>
                  </div>
                </div>
              </div>
            ) : null}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
              <section>
                <h2 className="text-lg font-bold text-ev-text mb-4 flex items-center gap-2">
                  <Store size={18} className="text-ev-primary" />
                  Revenue by shop
                </h2>
                <div className="ev-card p-5 space-y-4 border-ev-border">
                  {revenueByShop.length === 0 ? (
                    <p className="text-ev-muted text-sm">No order revenue recorded yet.</p>
                  ) : (
                    revenueByShop.map((s) => (
                      <div key={s.admin_id}>
                        <div className="flex justify-between text-sm mb-1.5">
                          <span className="font-medium text-ev-text">{s.shop_name}</span>
                          <span className="text-ev-muted font-semibold">{formatSuperadminCompactINR(s.amount)}</span>
                        </div>
                        <div className="h-2 rounded-full bg-ev-surface2 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-primary"
                            style={{ width: `${Math.round((s.amount / maxShopRev) * 100)}%` }}
                          />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </section>

              <section>
                <h2 className="text-lg font-bold text-ev-text flex items-center gap-2 mb-4">
                  <ShoppingBag size={18} className="text-ev-primary" />
                  Recent orders — all shops
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
                Recent emails sent
              </h2>
              <div className="ev-card overflow-hidden border-ev-border">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-ev-border bg-ev-surface2 text-left text-ev-muted">
                        <th className="px-4 py-3 font-semibold">Trigger</th>
                        <th className="px-4 py-3 font-semibold">Recipient</th>
                        <th className="px-4 py-3 font-semibold">Status</th>
                        <th className="px-4 py-3 font-semibold">Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentEmails.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-4 py-10 text-center text-ev-muted">
                            No email history
                          </td>
                        </tr>
                      ) : (
                        recentEmails.map((e, i) => (
                          <tr key={`${e.time}-${i}`} className="border-b border-ev-border last:border-0">
                            <td className="px-4 py-3 font-mono text-xs text-ev-text">{e.trigger}</td>
                            <td className="px-4 py-3 text-ev-muted truncate max-w-[200px]" title={e.recipient}>
                              {e.recipient}
                            </td>
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
              <Link href="/super/shops" className="ev-btn-secondary text-sm py-2.5 px-4">
                All shops
              </Link>
              <Link href="/super/settlements" className="ev-btn-secondary text-sm py-2.5 px-4">
                Settlements
              </Link>
              <Link href="/super/analytics" className="ev-btn-secondary text-sm py-2.5 px-4">
                Full analytics
              </Link>
            </div>
          </>
        )}
      </main>
    </SuperadminShell>
  );
}
