'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { TrendingUp, Loader2, PieChart } from 'lucide-react';
import toast from 'react-hot-toast';
import { adminApi } from '@/lib/api';
import { AdminShell } from '@/components/admin/AdminShell';

type OrderRow = {
  id: string;
  status?: string;
  total_amount?: number;
  delivered_at?: string;
  created_at?: string;
  buyer_type?: string;
};

type OrderItem = { product_name?: string; quantity?: number; line_total?: number };

type OrderDetail = { id: string; items?: OrderItem[] };

function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function formatINR(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
}

export default function AdminRevenuePage() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [topProducts, setTopProducts] = useState<{ name: string; qty: number; revenue: number }[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await adminApi.getOrders();
      const list = Array.isArray(data) ? (data as OrderRow[]) : [];
      setOrders(list);
      const delivered = list.filter((o) => String(o.status || '').toLowerCase() === 'delivered').slice(0, 40);
      const details = await Promise.all(
        delivered.map(async (o) => {
          try {
            const r = await adminApi.getOrder(o.id);
            return r.data as OrderDetail;
          } catch {
            return null;
          }
        }),
      );
      const map = new Map<string, { qty: number; revenue: number }>();
      for (const d of details) {
        if (!d?.items) continue;
        for (const it of d.items) {
          const name = String(it.product_name || 'Item');
          const q = Number(it.quantity || 1);
          const rev = Number(it.line_total || 0);
          const cur = map.get(name) || { qty: 0, revenue: 0 };
          map.set(name, { qty: cur.qty + q, revenue: cur.revenue + rev });
        }
      }
      const ranked = [...map.entries()]
        .map(([name, v]) => ({ name, qty: v.qty, revenue: v.revenue }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 8);
      setTopProducts(ranked);
    } catch {
      toast.error('Could not load revenue data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const stats = useMemo(() => {
    const now = new Date();
    const ok = (o: OrderRow) => {
      const s = String(o.status || '').toLowerCase();
      return s !== 'order_cancelled' && s !== 'payment_failed';
    };
    const total = orders.filter(ok).reduce((s, o) => s + Number(o.total_amount || 0), 0);

    const delivered = orders.filter((o) => String(o.status || '').toLowerCase() === 'delivered');
    const sumDeliveredInMonth = (y: number, m: number) =>
      delivered.reduce((acc, o) => {
        if (!o.delivered_at) return acc;
        const d = new Date(o.delivered_at);
        if (d.getFullYear() === y && d.getMonth() === m) return acc + Number(o.total_amount || 0);
        return acc;
      }, 0);
    const thisM = sumDeliveredInMonth(now.getFullYear(), now.getMonth());
    const last = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastM = sumDeliveredInMonth(last.getFullYear(), last.getMonth());

    const months: { key: string; label: string; amount: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const y = d.getFullYear();
      const m = d.getMonth();
      const amount = delivered.reduce((acc, o) => {
        if (!o.delivered_at) return acc;
        const dt = new Date(o.delivered_at);
        if (dt.getFullYear() === y && dt.getMonth() === m) return acc + Number(o.total_amount || 0);
        return acc;
      }, 0);
      months.push({
        key: monthKey(d),
        label: d.toLocaleString('en-IN', { month: 'short' }),
        amount,
      });
    }

    let cust = 0;
    let deal = 0;
    for (const o of orders.filter(ok)) {
      const t = Number(o.total_amount || 0);
      if (String(o.buyer_type).toLowerCase() === 'dealer') deal += t;
      else cust += t;
    }

    return { total, thisM, lastM, months, cust, deal, maxBar: Math.max(...months.map((m) => m.amount), 1) };
  }, [orders]);

  return (
    <AdminShell>
      <main className="p-6 sm:p-10 max-w-5xl">
        <h1 className="text-2xl font-bold text-ev-text flex items-center gap-2 mb-2">
          <TrendingUp size={26} className="text-ev-primary" />
          Revenue
        </h1>
        <p className="text-ev-muted text-sm mb-8">
          Derived from your shop orders. Payouts from the platform are handled separately — see{' '}
          <Link href="/admin/dashboard" className="text-ev-primary hover:underline">
            dashboard
          </Link>{' '}
          for operational KPIs.
        </p>

        {loading ? (
          <div className="flex items-center gap-2 text-ev-muted py-16">
            <Loader2 className="animate-spin text-ev-primary" size={22} />
            Loading…
          </div>
        ) : (
          <div className="space-y-8">
            <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              <div className="ev-card p-5">
                <p className="text-ev-muted text-xs uppercase tracking-wide mb-1">Total revenue</p>
                <p className="text-2xl font-bold text-ev-text tabular-nums">{formatINR(stats.total)}</p>
                <p className="text-ev-subtle text-xs mt-2">Non-cancelled orders (all time)</p>
              </div>
              <div className="ev-card p-5">
                <p className="text-ev-muted text-xs uppercase tracking-wide mb-1">This month</p>
                <p className="text-2xl font-bold text-ev-text tabular-nums">{formatINR(stats.thisM)}</p>
                <p className="text-ev-subtle text-xs mt-2">Delivered orders</p>
              </div>
              <div className="ev-card p-5">
                <p className="text-ev-muted text-xs uppercase tracking-wide mb-1">Last month</p>
                <p className="text-2xl font-bold text-ev-text tabular-nums">{formatINR(stats.lastM)}</p>
                <p className="text-ev-subtle text-xs mt-2">Delivered orders</p>
              </div>
              <div className="ev-card p-5 border-ev-warning/20 bg-ev-warning/5">
                <p className="text-ev-muted text-xs uppercase tracking-wide mb-1">Pending payout</p>
                <p className="text-2xl font-bold text-ev-text">—</p>
                <p className="text-ev-subtle text-xs mt-2">Settled by platform; contact admin if needed</p>
              </div>
            </section>

            <section className="ev-card p-6">
              <h2 className="text-ev-text font-semibold mb-4">Monthly revenue (last 6 months)</h2>
              <p className="text-ev-muted text-xs mb-4">From delivered orders only</p>
              <div className="flex items-end justify-between gap-2 h-40 px-1">
                {stats.months.map((m) => {
                  const h = Math.round((m.amount / stats.maxBar) * 100);
                  const height = Math.max(h, m.amount > 0 ? 8 : 4);
                  return (
                    <div key={m.key} className="flex-1 flex flex-col items-center gap-2 min-w-0">
                      <div
                        className="w-full max-w-[48px] mx-auto rounded-t-lg bg-gradient-to-t from-ev-primary-dark to-ev-primary border border-ev-border"
                        style={{ height: `${height}%` }}
                        title={formatINR(m.amount)}
                      />
                      <span className="text-[11px] text-ev-muted font-medium">{m.label}</span>
                    </div>
                  );
                })}
              </div>
            </section>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <section className="ev-card p-6">
                <h2 className="text-ev-text font-semibold mb-4 flex items-center gap-2">
                  <PieChart size={18} className="text-ev-primary" />
                  Customer vs dealer orders
                </h2>
                <p className="text-sm text-ev-muted mb-4">Revenue share on non-cancelled orders</p>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-ev-muted">Customer orders</span>
                    <span className="font-semibold text-ev-text">{formatINR(stats.cust)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-ev-muted">Dealer orders</span>
                    <span className="font-semibold text-ev-text">{formatINR(stats.deal)}</span>
                  </div>
                  <div className="h-2 rounded-full bg-ev-surface2 overflow-hidden flex mt-2">
                    <div
                      className="h-full bg-ev-primary"
                      style={{
                        width: `${stats.cust + stats.deal > 0 ? Math.round((stats.cust / (stats.cust + stats.deal)) * 100) : 50}%`,
                      }}
                    />
                    <div className="h-full flex-1 bg-ev-accent/80" />
                  </div>
                </div>
              </section>

              <section className="ev-card p-6">
                <h2 className="text-ev-text font-semibold mb-4">Top selling products</h2>
                <p className="text-ev-muted text-xs mb-4">From up to 40 recent delivered orders (line items)</p>
                {topProducts.length === 0 ? (
                  <p className="text-ev-muted text-sm">Not enough delivered order line items yet.</p>
                ) : (
                  <ul className="space-y-2 text-sm">
                    {topProducts.map((p) => (
                      <li key={p.name} className="flex justify-between gap-2 border-b border-ev-border pb-2 last:border-0">
                        <span className="text-ev-text truncate" title={p.name}>
                          {p.name}
                        </span>
                        <span className="text-ev-muted shrink-0">
                          {p.qty} sold · {formatINR(p.revenue)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>
          </div>
        )}
      </main>
    </AdminShell>
  );
}
