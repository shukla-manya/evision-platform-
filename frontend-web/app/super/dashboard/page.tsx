'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowUpRight,
  Store,
  ShoppingBag,
  Clock,
  ChevronRight,
  Loader2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { superadminApi } from '@/lib/api';
import { getApiErrorMessage } from '@/lib/api-errors';
import { SuperadminShell } from '@/components/superadmin/SuperadminShell';
import { getToken, parseJwt } from '@/lib/auth';

type AnalyticsSnapshot = {
  admins: { total: number; pending: number; approved: number; rejected: number; suspended: number };
  users: { total: number; customers: number; dealers: number };
  emails: { total: number; sent: number; failed: number };
  generated_at?: string;
};

type AdminRow = { id: string; shop_name?: string; owner_name?: string; email?: string };
type ElectricianRow = { id: string; name?: string; email?: string };

const DEMO_REVENUE_TOTAL = 420000;
const DEMO_ORDERS_TODAY = 38;
const DEMO_ORDERS_DELTA = 8;

const DEMO_RECENT_ORDERS = [
  { id: 'G1042', customer: 'Priya S.', shop: 'CamZone', amount: 62490, status: 'Delivered', statusTone: 'success' as const },
  { id: 'G1041', customer: 'Rohit M.', shop: 'LensKart', amount: 18200, status: 'In transit', statusTone: 'pending' as const },
  { id: 'G1040', customer: 'Sneha D.', shop: 'ShutterHub', amount: 44000, status: 'Confirmed', statusTone: 'muted' as const },
  { id: 'G1039', customer: 'Arjun P.', shop: 'OpticWorld', amount: 8500, status: 'Payment failed', statusTone: 'error' as const },
];

const FALLBACK_SHOP_REVENUE = [
  { name: 'CamZone', amount: 140000 },
  { name: 'LensKart', amount: 110000 },
  { name: 'ShutterHub', amount: 90000 },
  { name: 'OpticWorld', amount: 80000 },
];

function formatINR(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
}

function formatCompactINR(n: number) {
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)}K`;
  return formatINR(n);
}

function greetingLabel() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function displayNameFromEmail(email: string) {
  if (!email) return 'Manya';
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
  return 'MS';
}

export default function SuperadminDashboardPage() {
  const [analytics, setAnalytics] = useState<AnalyticsSnapshot | null>(null);
  const [pendingAdmins, setPendingAdmins] = useState<AdminRow[]>([]);
  const [pendingElectricians, setPendingElectricians] = useState<ElectricianRow[]>([]);
  const [approvedShops, setApprovedShops] = useState<{ name: string; amount: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);

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
      const [anRes, paRes, peRes, allRes] = await Promise.all([
        superadminApi.getAnalytics(),
        superadminApi.getPendingAdmins(),
        superadminApi.getPendingElectricians(),
        superadminApi.getAllAdmins(),
      ]);
      setAnalytics(anRes.data as AnalyticsSnapshot);
      setPendingAdmins(Array.isArray(paRes.data) ? (paRes.data as AdminRow[]) : []);
      setPendingElectricians(Array.isArray(peRes.data) ? (peRes.data as ElectricianRow[]) : []);

      const all = Array.isArray(allRes.data) ? (allRes.data as { shop_name?: string; status?: string }[]) : [];
      const approved = all.filter((a) => String(a.status) === 'approved' && a.shop_name);
      const slice = approved.slice(0, 4);
      const amounts = FALLBACK_SHOP_REVENUE.map((f) => f.amount);
      if (slice.length > 0) {
        setApprovedShops(
          slice.map((s, i) => ({
            name: String(s.shop_name),
            amount: amounts[i % amounts.length],
          })),
        );
      } else {
        setApprovedShops(FALLBACK_SHOP_REVENUE);
      }
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
    const rows: { id: string; name: string; type: 'Admin' | 'Electrician' }[] = [];
    pendingAdmins.forEach((a) =>
      rows.push({ id: a.id, name: String(a.shop_name || a.owner_name || a.email || 'Shop'), type: 'Admin' }),
    );
    pendingElectricians.forEach((e) =>
      rows.push({ id: e.id, name: String(e.name || e.email || 'Electrician'), type: 'Electrician' }),
    );
    return rows.slice(0, 6);
  }, [pendingAdmins, pendingElectricians]);

  async function approveRow(row: { id: string; type: 'Admin' | 'Electrician' }) {
    setActionId(row.id);
    try {
      if (row.type === 'Admin') {
        await superadminApi.approveAdmin(row.id);
        toast.success('Shop approved');
      } else {
        await superadminApi.reviewElectrician(row.id, { action: 'approve' });
        toast.success('Electrician approved');
      }
      await load();
    } catch (e: unknown) {
      toast.error(getApiErrorMessage(e, 'Action failed'));
    } finally {
      setActionId(null);
    }
  }

  const maxShopRev = approvedShops.length > 0 ? Math.max(...approvedShops.map((s) => s.amount), 1) : 1;

  return (
    <SuperadminShell>
      <main className="p-6 sm:p-10 max-w-6xl">
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
                  {greetingLabel()}, <span className="text-ev-text font-semibold">{greetName}</span>
                </p>
                <h1 className="text-2xl sm:text-3xl font-bold text-ev-text tracking-tight">Platform overview</h1>
                <p className="text-ev-muted text-sm mt-1">{todayLabel}</p>
              </div>
              <div
                className="w-12 h-12 rounded-2xl bg-ev-indigo text-white font-bold text-sm flex items-center justify-center shrink-0 shadow-ev-md border border-white/10"
                aria-hidden
              >
                {initials}
              </div>
            </header>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-10">
              <div className="ev-card p-6 border-ev-border">
                <p className="text-ev-muted text-sm font-medium">Total revenue</p>
                <p className="text-3xl font-bold text-ev-text mt-2">{formatCompactINR(DEMO_REVENUE_TOTAL)}</p>
                <p className="text-ev-success text-sm font-medium mt-2 inline-flex items-center gap-1">
                  <ArrowUpRight size={16} aria-hidden />
                  12% this month
                </p>
                <p className="text-ev-subtle text-xs mt-3">Illustrative total — wire live orders to replace.</p>
              </div>
              <div className="ev-card p-6 border-ev-border">
                <p className="text-ev-muted text-sm font-medium">Orders today</p>
                <p className="text-3xl font-bold text-ev-text mt-2">{DEMO_ORDERS_TODAY}</p>
                <p className="text-ev-success text-sm font-medium mt-2 inline-flex items-center gap-1">
                  <ArrowUpRight size={16} aria-hidden />↑ {DEMO_ORDERS_DELTA} vs yesterday
                </p>
                <p className="text-ev-subtle text-xs mt-3">Sample pulse — connect live order feed.</p>
              </div>
              <div className="ev-card p-6 border-ev-border">
                <p className="text-ev-muted text-sm font-medium">Active shops</p>
                <p className="text-3xl font-bold text-ev-text mt-2">{analytics?.admins.approved ?? '—'}</p>
                <p className="text-ev-muted text-sm mt-2">All approved</p>
              </div>
              <div className="ev-card p-6 border-ev-border border-ev-warning/25 bg-ev-warning/5">
                <p className="text-ev-muted text-sm font-medium">Pending approvals</p>
                <p className="text-3xl font-bold text-ev-text mt-2">{pendingTotal}</p>
                <p className="text-ev-muted text-sm mt-2">
                  {pendingAdmins.length} admin{pendingAdmins.length !== 1 ? 's' : ''} · {pendingElectricians.length} elec.
                </p>
              </div>
            </div>

            <section className="mb-10">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-ev-text">Pending approvals</h2>
                <Link
                  href="/superadmin/approvals"
                  className="text-sm font-semibold text-ev-primary hover:text-ev-primary-light inline-flex items-center gap-1"
                >
                  View all
                  <ChevronRight size={16} />
                </Link>
              </div>
              <div className="ev-card overflow-hidden border-ev-border">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-ev-border bg-ev-surface2 text-left text-ev-muted">
                        <th className="px-4 py-3 font-semibold">Name</th>
                        <th className="px-4 py-3 font-semibold">Type</th>
                        <th className="px-4 py-3 font-semibold text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {approvalPreview.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="px-4 py-10 text-center text-ev-muted">
                            No pending approvals
                          </td>
                        </tr>
                      ) : (
                        approvalPreview.map((row) => (
                          <tr key={`${row.type}-${row.id}`} className="border-b border-ev-border last:border-0">
                            <td className="px-4 py-3 font-medium text-ev-text">{row.name}</td>
                            <td className="px-4 py-3 text-ev-muted">{row.type}</td>
                            <td className="px-4 py-3 text-right">
                              <button
                                type="button"
                                disabled={actionId === row.id}
                                onClick={() => void approveRow(row)}
                                className="text-sm font-semibold text-ev-primary hover:text-ev-primary-light disabled:opacity-50"
                              >
                                {actionId === row.id ? '…' : 'Approve'}
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

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
              <section>
                <h2 className="text-lg font-bold text-ev-text mb-4 flex items-center gap-2">
                  <Store size={18} className="text-ev-primary" />
                  Revenue by shop
                </h2>
                <div className="ev-card p-5 space-y-4 border-ev-border">
                  {approvedShops.map((s) => (
                    <div key={s.name}>
                      <div className="flex justify-between text-sm mb-1.5">
                        <span className="font-medium text-ev-text">{s.name}</span>
                        <span className="text-ev-muted font-semibold">{formatCompactINR(s.amount)}</span>
                      </div>
                      <div className="h-2 rounded-full bg-ev-surface2 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-primary"
                          style={{ width: `${Math.round((s.amount / maxShopRev) * 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-ev-text flex items-center gap-2">
                    <ShoppingBag size={18} className="text-ev-primary" />
                    Recent orders — all shops
                  </h2>
                  <span className="text-xs text-ev-subtle">Sample rows</span>
                </div>
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
                        {DEMO_RECENT_ORDERS.map((o) => (
                          <tr key={o.id} className="border-b border-ev-border last:border-0">
                            <td className="px-4 py-3 font-mono text-ev-text">#{o.id}</td>
                            <td className="px-4 py-3 text-ev-text">{o.customer}</td>
                            <td className="px-4 py-3 text-ev-muted">{o.shop}</td>
                            <td className="px-4 py-3 font-medium text-ev-text">{formatINR(o.amount)}</td>
                            <td className="px-4 py-3">
                              <span
                                className={
                                  o.statusTone === 'success'
                                    ? 'text-ev-success font-medium'
                                    : o.statusTone === 'error'
                                      ? 'text-ev-error font-medium'
                                      : o.statusTone === 'pending'
                                        ? 'text-ev-warning font-medium'
                                        : 'text-ev-muted font-medium'
                                }
                              >
                                {o.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </section>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link href="/superadmin/approvals" className="ev-btn-secondary text-sm py-2.5 px-4 inline-flex items-center gap-2">
                <Clock size={16} />
                Approvals queue
              </Link>
              <Link href="/superadmin/shops" className="ev-btn-secondary text-sm py-2.5 px-4">
                All shops
              </Link>
              <Link href="/superadmin/analytics" className="ev-btn-secondary text-sm py-2.5 px-4">
                Full report
              </Link>
            </div>
          </>
        )}
      </main>
    </SuperadminShell>
  );
}
