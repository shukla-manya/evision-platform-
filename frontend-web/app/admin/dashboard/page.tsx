'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  BarChart3,
  Clock,
  LifeBuoy,
  Package,
  Plus,
  ShoppingCart,
  TrendingUp,
  Truck,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { adminApi } from '@/lib/api';
import { AdminShell } from '@/components/admin/AdminShell';
import { orderNeedsShipment } from '@/lib/admin-orders';

type AdminMe = {
  shop_name?: string;
  owner_name?: string;
  status?: string;
};

type ListOrder = {
  id: string;
  status?: string;
  total?: number;
  total_amount?: number;
  created_at?: string;
  delivered_at?: string;
  user_id?: string;
};

type OrderItemRow = { product_name?: string; quantity?: number };

type OrderDetail = {
  customer?: { name?: string; email?: string; role?: string } | null;
  items?: OrderItemRow[];
};

type ProductRow = {
  id: string;
  name: string;
  stock: number;
  low_stock_threshold?: number;
  is_low_stock?: boolean;
};

function initials(name?: string) {
  const t = name?.trim();
  if (!t) return '?';
  const parts = t.split(/\s+/);
  const a = parts[0]?.[0] ?? '';
  const b = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : (parts[0]?.[1] ?? '');
  return (a + b).toUpperCase().slice(0, 2);
}

function calendarDayKey(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function dayKeyFromIso(iso: string) {
  return calendarDayKey(new Date(iso));
}

function startOfWeekMonday(d = new Date()) {
  const x = new Date(d);
  const dw = x.getDay();
  const diff = dw === 0 ? -6 : 1 - dw;
  x.setDate(x.getDate() + diff);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfWeekSunday(start: Date) {
  const e = new Date(start);
  e.setDate(e.getDate() + 6);
  e.setHours(23, 59, 59, 999);
  return e;
}

function fmtInrShort(n: number) {
  if (!Number.isFinite(n) || n <= 0) return '₹0';
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(1)}Cr`;
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(1)}L`;
  if (n >= 1e3) return `₹${(n / 1e3).toFixed(0)}k`;
  return `₹${Math.round(n).toLocaleString('en-IN')}`;
}

function orderDisplayRef(id: string) {
  const digits = id.replace(/\D/g, '');
  const tail = digits.slice(-4).padStart(4, '0');
  return `#${tail}`;
}

function packStatusLabel(_order: ListOrder) {
  return 'To pack';
}

export default function AdminDashboardPage() {
  const [admin, setAdmin] = useState<AdminMe | null>(null);
  const [orders, setOrders] = useState<ListOrder[]>([]);
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [shipRows, setShipRows] = useState<Array<{ list: ListOrder; detail: OrderDetail | null }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const meRes = await adminApi.getMe();
        if (cancelled) return;
        const me = meRes.data as AdminMe;
        setAdmin(me);
        if (me.status === 'pending') {
          setLoading(false);
          return;
        }
        const [ordRes, prodRes] = await Promise.all([
          adminApi.getOrders().catch(() => ({ data: [] })),
          adminApi.getProducts().catch(() => ({ data: [] })),
        ]);
        if (cancelled) return;
        const ordList = Array.isArray(ordRes.data) ? (ordRes.data as ListOrder[]) : [];
        const prodList = Array.isArray(prodRes.data) ? (prodRes.data as ProductRow[]) : [];
        setOrders(ordList);
        setProducts(prodList);

        const toShip = ordList.filter((o) => orderNeedsShipment(o.status)).slice(0, 8);
        const enriched = await Promise.all(
          toShip.map(async (o) => {
            try {
              const { data } = await adminApi.getOrder(o.id);
              return { list: o, detail: data as OrderDetail };
            } catch {
              return { list: o, detail: null };
            }
          }),
        );
        if (!cancelled) setShipRows(enriched);
      } catch {
        if (!cancelled) toast.error('Failed to load dashboard');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const shopName = admin?.shop_name?.trim() || 'Your shop';

  const metrics = useMemo(() => {
    const now = new Date();
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();
    const lastMonthDate = new Date(thisYear, thisMonth - 1, 1);

    const monthSum = (year: number, month: number) =>
      orders
        .filter((o) => String(o.status || '').toLowerCase() === 'delivered' && o.delivered_at)
        .reduce((acc, o) => {
          const d = new Date(o.delivered_at!);
          if (d.getFullYear() === year && d.getMonth() === month) {
            return acc + Number(o.total_amount ?? o.total ?? 0);
          }
          return acc;
        }, 0);

    const revThis = monthSum(thisYear, thisMonth);
    const revLast = monthSum(lastMonthDate.getFullYear(), lastMonthDate.getMonth());
    const revDeltaPct = revLast > 0 ? Math.round(((revThis - revLast) / revLast) * 100) : revThis > 0 ? 100 : 0;

    const toShipCount = orders.filter((o) => orderNeedsShipment(o.status)).length;
    const lowStockCount = products.filter((p) => {
      const thr = p.low_stock_threshold ?? 10;
      return p.stock <= thr;
    }).length;

    const tKey = calendarDayKey(new Date());
    const yd = new Date();
    yd.setDate(yd.getDate() - 1);
    const yKey = calendarDayKey(yd);
    let deliveredToday = 0;
    let deliveredYesterday = 0;
    for (const o of orders) {
      if (String(o.status || '').toLowerCase() !== 'delivered' || !o.delivered_at) continue;
      const k = dayKeyFromIso(o.delivered_at);
      if (k === tKey) deliveredToday += 1;
      if (k === yKey) deliveredYesterday += 1;
    }

    const weekStart = startOfWeekMonday();
    const weekEnd = endOfWeekSunday(weekStart);
    const weekBuckets = [0, 0, 0, 0, 0, 0, 0];
    for (const o of orders) {
      if (!o.created_at) continue;
      const dt = new Date(o.created_at);
      if (dt < weekStart || dt > weekEnd) continue;
      const idx = (dt.getDay() + 6) % 7;
      weekBuckets[idx] += Number(o.total_amount ?? o.total ?? 0);
    }
    const lastWeekStart = new Date(weekStart);
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);
    const lastWeekEnd = endOfWeekSunday(lastWeekStart);
    const lastWeekBuckets = [0, 0, 0, 0, 0, 0, 0];
    for (const o of orders) {
      if (!o.created_at) continue;
      const dt = new Date(o.created_at);
      if (dt < lastWeekStart || dt > lastWeekEnd) continue;
      const idx = (dt.getDay() + 6) % 7;
      lastWeekBuckets[idx] += Number(o.total_amount ?? o.total ?? 0);
    }
    const weekMax = Math.max(...weekBuckets, ...lastWeekBuckets, 1);

    const lowStockProducts = [...products]
      .filter((p) => {
        const thr = p.low_stock_threshold ?? 10;
        return p.stock <= thr;
      })
      .sort((a, b) => a.stock - b.stock)
      .slice(0, 4);

    return {
      revThis,
      revDeltaPct,
      toShipCount,
      lowStockCount,
      deliveredToday,
      deliveredYesterday,
      weekBuckets,
      lastWeekBuckets,
      weekMax,
      lowStockProducts,
      productTotal: products.length,
      pendingServiceRequests: 0,
    };
  }, [orders, products]);

  if (loading || !admin) {
    return (
      <AdminShell>
        <main className="p-10 text-ev-muted text-sm">Loading dashboard…</main>
      </AdminShell>
    );
  }

  if (admin.status === 'pending') {
    return (
      <AdminShell>
        <main className="p-6 sm:p-10 flex items-center justify-center min-h-[60vh]">
          <div className="max-w-md w-full ev-card p-10 text-center">
            <div className="w-16 h-16 bg-ev-warning/10 border-2 border-ev-warning rounded-full flex items-center justify-center mx-auto mb-6">
              <Clock size={32} className="text-ev-warning" />
            </div>
            <h2 className="text-xl font-bold text-ev-text mb-3">Awaiting approval</h2>
            <p className="text-ev-muted text-sm leading-relaxed">
              Your shop <strong className="text-ev-text">{admin.shop_name}</strong> is under review. You will be
              notified by email once your account is approved.
            </p>
          </div>
        </main>
      </AdminShell>
    );
  }

  const deliveredDelta = metrics.deliveredToday - metrics.deliveredYesterday;
  const weekLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <AdminShell>
      <main className="p-6 sm:p-10 max-w-6xl mx-auto space-y-8">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-ev-muted text-sm mb-1">Welcome,</p>
            <h1 className="text-2xl font-bold text-ev-text tracking-tight">{shopName}</h1>
            <p className="text-ev-muted text-sm mt-1">
              {metrics.toShipCount > 0 ? (
                <span className="text-ev-warning font-medium">{metrics.toShipCount} orders need shipment</span>
              ) : (
                <span>All caught up on shipping</span>
              )}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/admin/products/new"
              className="ev-btn-primary inline-flex items-center gap-2 text-sm px-4 py-2.5 rounded-xl"
            >
              <Plus size={18} />
              Add product
            </Link>
            <div
              className="w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center text-white text-sm font-bold shadow-ev-md border border-white/10"
              title={admin.owner_name || 'Owner'}
            >
              {initials(admin.owner_name)}
            </div>
          </div>
        </header>

        <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          <div className="ev-card p-5">
            <p className="text-ev-muted text-xs font-medium uppercase tracking-wide mb-1">Revenue this month</p>
            <p className="text-2xl font-bold text-ev-text tabular-nums">{fmtInrShort(metrics.revThis)}</p>
            <p className="text-ev-muted text-xs mt-2 flex items-center gap-1 flex-wrap">
              {metrics.revThis > 0 || metrics.revDeltaPct !== 0 ? (
                <>
                  <TrendingUp size={14} className={metrics.revDeltaPct >= 0 ? 'text-ev-success' : 'text-ev-error'} />
                  <span className={metrics.revDeltaPct >= 0 ? 'text-ev-success' : 'text-ev-error'}>
                    {metrics.revDeltaPct >= 0 ? '↑' : '↓'} {Math.abs(metrics.revDeltaPct)}%
                  </span>
                  <span> vs last month (delivered)</span>
                </>
              ) : (
                <span>From delivered orders</span>
              )}
            </p>
          </div>
          <Link href="/admin/orders" className="ev-card p-5 hover:border-ev-primary/25 transition-colors block">
            <p className="text-ev-muted text-xs font-medium uppercase tracking-wide mb-1">Orders to ship</p>
            <p className="text-2xl font-bold text-ev-text tabular-nums">{metrics.toShipCount}</p>
            <p className="text-ev-muted text-xs mt-2">Awaiting shipment</p>
          </Link>
          <Link href="/admin/products" className="ev-card p-5 hover:border-ev-primary/25 transition-colors block">
            <p className="text-ev-muted text-xs font-medium uppercase tracking-wide mb-1">Total products</p>
            <p className="text-2xl font-bold text-ev-text tabular-nums">{metrics.productTotal}</p>
            <p className="text-ev-muted text-xs mt-2">In catalogue</p>
          </Link>
          <Link href="/admin/inventory" className="ev-card p-5 hover:border-ev-warning/20 bg-ev-warning/5 transition-colors block">
            <p className="text-ev-muted text-xs font-medium uppercase tracking-wide mb-1">Low stock alerts</p>
            <p className="text-2xl font-bold text-ev-text tabular-nums">{metrics.lowStockCount}</p>
            <p className="text-ev-muted text-xs mt-2">SKUs at or below threshold</p>
          </Link>
          <div className="ev-card p-5">
            <p className="text-ev-muted text-xs font-medium uppercase tracking-wide mb-1">Delivered today</p>
            <p className="text-2xl font-bold text-ev-text tabular-nums">{metrics.deliveredToday}</p>
            <p className="text-ev-muted text-xs mt-2">
              {deliveredDelta !== 0 ? (
                <span className={deliveredDelta >= 0 ? 'text-ev-success' : 'text-ev-error'}>
                  {deliveredDelta >= 0 ? '↑' : '↓'} {Math.abs(deliveredDelta)} vs yesterday
                </span>
              ) : (
                'vs yesterday'
              )}
            </p>
          </div>
          <Link href="/admin/service-requests" className="ev-card p-5 hover:border-ev-primary/25 transition-colors block">
            <p className="text-ev-muted text-xs font-medium uppercase tracking-wide mb-1">Pending service requests</p>
            <p className="text-2xl font-bold text-ev-text tabular-nums">{metrics.pendingServiceRequests}</p>
            <p className="text-ev-muted text-xs mt-2 inline-flex items-center gap-1">
              <LifeBuoy size={12} />
              View queue
            </p>
          </Link>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <section className="lg:col-span-3 ev-card overflow-hidden">
            <div className="px-5 py-4 border-b border-ev-border flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-ev-text font-semibold">Orders needing shipment</h2>
                <p className="text-ev-muted text-xs mt-0.5">Generate shipment via Shiprocket</p>
              </div>
              <Link href="/admin/orders" className="text-sm text-ev-primary font-medium inline-flex items-center gap-1 hover:underline">
                View all orders
                <ArrowRight size={14} />
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-ev-border text-left bg-ev-surface2/50">
                    {(
                      [
                        ['order', 'Order'],
                        ['buyer', 'Buyer'],
                        ['items', 'Items'],
                        ['amount', 'Amount'],
                        ['status', 'Status'],
                        ['ship', ''],
                      ] as const
                    ).map(([key, h]) => (
                      <th
                        key={key}
                        className="px-4 py-3 text-ev-muted text-xs font-medium uppercase tracking-wide whitespace-nowrap"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-ev-border">
                  {shipRows.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-10 text-center text-ev-muted">
                        No orders waiting to ship.
                      </td>
                    </tr>
                  ) : (
                    shipRows.map(({ list: o, detail }) => {
                      const cust = detail?.customer;
                      const role = String(cust?.role || '').toLowerCase();
                      const buyerName = cust?.name || cust?.email || 'Customer';
                      const buyer =
                        role === 'dealer' && cust?.name ? `Dealer: ${cust.name}` : buyerName;
                      const items = detail?.items?.length
                        ? detail.items
                            .map((it) => `${it.product_name ?? 'Item'} ×${it.quantity ?? 1}`)
                            .join(', ')
                        : '—';
                      const amt = Number(o.total_amount ?? o.total ?? 0);
                      return (
                        <tr key={o.id} className="hover:bg-ev-surface2/40">
                          <td className="px-4 py-3 font-mono text-xs text-ev-text">{orderDisplayRef(o.id)}</td>
                          <td className="px-4 py-3 text-ev-text max-w-[140px] truncate" title={buyer}>
                            {buyer}
                          </td>
                          <td className="px-4 py-3 text-ev-muted max-w-[200px] truncate" title={items}>
                            {items}
                          </td>
                          <td className="px-4 py-3 font-semibold whitespace-nowrap tabular-nums">
                            ₹{amt.toLocaleString('en-IN')}
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-[11px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full border border-ev-border bg-ev-surface2 text-ev-muted">
                              {packStatusLabel(o)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Link
                              href={`/admin/orders/${o.id}`}
                              className="inline-flex items-center gap-1 text-xs font-semibold text-white bg-ev-primary hover:bg-ev-primary-dark px-3 py-1.5 rounded-lg transition-colors"
                            >
                              <Truck size={14} />
                              Ship
                            </Link>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="lg:col-span-2 ev-card p-5 flex flex-col">
            <div className="flex items-center justify-between gap-2 mb-4">
              <h2 className="text-ev-text font-semibold">Low stock products</h2>
              <Link href="/admin/inventory" className="text-xs text-ev-primary font-medium hover:underline">
                Restock
              </Link>
            </div>
            <div className="space-y-3 flex-1">
              {metrics.lowStockProducts.length === 0 ? (
                <p className="text-ev-muted text-sm py-6 text-center">No low-stock SKUs right now.</p>
              ) : (
                metrics.lowStockProducts.map((p) => {
                  const thr = p.low_stock_threshold ?? 10;
                  const critical = p.stock <= Math.max(1, Math.floor(thr / 2));
                  return (
                    <div
                      key={p.id}
                      className="flex gap-3 rounded-xl border border-ev-border bg-ev-surface2/40 p-3 items-start"
                    >
                      <div className="w-10 h-10 rounded-lg bg-ev-primary/10 flex items-center justify-center shrink-0">
                        <Package size={18} className="text-ev-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-ev-text text-sm font-medium truncate">{p.name}</p>
                        <p className="text-ev-muted text-xs mt-0.5">
                          Current stock: {p.stock}. Restock before you hit {thr} units (alert threshold).
                        </p>
                      </div>
                      <span
                        className={`shrink-0 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full border ${
                          critical
                            ? 'bg-ev-error/10 text-ev-error border-ev-error/25'
                            : 'bg-ev-warning/10 text-ev-warning border-ev-warning/25'
                        }`}
                      >
                        {critical ? 'Critical' : 'Low'}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </section>
        </div>

        <section className="ev-card p-5">
          <h2 className="text-ev-text font-semibold mb-2 flex items-center gap-2">
            <BarChart3 size={18} className="text-ev-primary" />
            Sales chart
          </h2>
          <p className="text-ev-muted text-xs mb-4">
            Order value by weekday — <span className="text-ev-primary font-medium">this week</span> vs{' '}
            <span className="text-ev-accent font-medium">last week</span> (order created date)
          </p>
          <div className="flex items-end justify-between gap-1 sm:gap-2 min-h-[10rem] px-1">
            {metrics.weekBuckets.map((v, i) => {
              const lw = metrics.lastWeekBuckets[i] ?? 0;
              const pctThis = Math.round((v / metrics.weekMax) * 100);
              const pctLast = Math.round((lw / metrics.weekMax) * 100);
              const hThis = Math.max(pctThis, v > 0 ? 6 : 3);
              const hLast = Math.max(pctLast, lw > 0 ? 6 : 3);
              return (
                <div key={weekLabels[i]} className="flex-1 flex flex-col items-center gap-2 min-w-0 max-w-[64px] mx-auto">
                  <div className="w-full h-28 flex items-end justify-center gap-0.5 rounded-t-md border border-ev-border bg-ev-surface2/50 px-0.5 pt-1">
                    <div
                      className="flex-1 max-w-[10px] rounded-t-sm bg-gradient-to-t from-ev-accent/80 to-ev-accent/40 min-h-[2px]"
                      style={{ height: `${hLast}%` }}
                      title={`Last week ${weekLabels[i]}: ₹${Math.round(lw).toLocaleString('en-IN')}`}
                    />
                    <div
                      className="flex-1 max-w-[10px] rounded-t-sm bg-gradient-to-t from-ev-primary-dark to-ev-primary min-h-[2px]"
                      style={{ height: `${hThis}%` }}
                      title={`This week ${weekLabels[i]}: ₹${Math.round(v).toLocaleString('en-IN')}`}
                    />
                  </div>
                  <span className="text-[11px] text-ev-muted font-medium">{weekLabels[i]}</span>
                </div>
              );
            })}
          </div>
          <div className="flex flex-wrap gap-4 mt-4 text-xs text-ev-muted">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-gradient-to-br from-ev-primary-dark to-ev-primary" /> This week
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-ev-accent/70" /> Last week
            </span>
          </div>
        </section>

        <section className="flex flex-wrap gap-3">
          <Link
            href="/admin/products"
            className="ev-btn-secondary inline-flex items-center gap-2 text-sm px-4 py-2.5 rounded-xl"
          >
            <Package size={16} />
            Products
          </Link>
          <Link
            href="/admin/orders"
            className="ev-btn-secondary inline-flex items-center gap-2 text-sm px-4 py-2.5 rounded-xl"
          >
            <ShoppingCart size={16} />
            Orders
          </Link>
        </section>
      </main>
    </AdminShell>
  );
}
