'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Store,
  ShoppingBag,
  FileText,
  LifeBuoy,
  UserRound,
  Download,
  Loader2,
  LogOut,
  ArrowRight,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { catalogApi, ordersApi } from '@/lib/api';
import { getApiErrorMessage } from '@/lib/api-errors';
import { clearAuth, getRole, getToken, parseJwt } from '@/lib/auth';
import { ResponsiveSidebarShell } from '@/components/layout/ResponsiveSidebarShell';
import { EvisionLogo } from '@/components/brand/EvisionLogo';

type OrderItem = {
  id: string;
  product_name?: string;
  quantity?: number;
  line_total?: number;
};

type SubOrder = {
  id: string;
  status?: string;
  total_amount?: number;
  items?: OrderItem[];
  customer_invoice_url?: string | null;
  dealer_invoice_url?: string | null;
  gst_invoice_url?: string | null;
};

type OrderGroup = {
  id: string;
  status?: string;
  total_amount?: number;
  created_at?: string;
  sub_orders?: SubOrder[];
};

type CatalogProduct = {
  id: string;
  name?: string;
  price_customer?: number;
  price_dealer?: number;
  mrp?: number;
  min_order_quantity?: number;
};

function formatInr(n: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Number(n || 0));
}

function initials(text: string) {
  const parts = text.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return 'DL';
  const a = parts[0]?.[0] ?? '';
  const b = parts[1]?.[0] ?? (parts[0]?.[1] ?? '');
  return (a + b).toUpperCase() || 'DL';
}

function dealerNameFromEmail(email?: string) {
  if (!email) return 'Dealer account';
  const local = email.split('@')[0].replace(/[._-]+/g, ' ').trim();
  if (!local) return 'Dealer account';
  return local
    .split(/\s+/)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(' ');
}

function orderLabel(id: string) {
  return `#D${id.replace(/\D/g, '').slice(-4).padStart(4, '0')}`;
}

function normalizeStatus(status?: string) {
  const s = String(status || '').toLowerCase();
  if (!s) return '—';
  if (s === 'in_transit') return 'In transit';
  if (s === 'out_for_delivery') return 'Out for delivery';
  if (s === 'order_received') return 'Order received';
  if (s === 'payment_confirmed') return 'Confirmed';
  return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function DealerDashboardPage() {
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<OrderGroup[]>([]);
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [downloading, setDownloading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [ordersRes, productsRes] = await Promise.all([
        ordersApi.myOrders(),
        catalogApi.getProducts().catch(() => ({ data: [] })),
      ]);
      setOrders(Array.isArray(ordersRes.data) ? (ordersRes.data as OrderGroup[]) : []);
      setProducts(Array.isArray(productsRes.data) ? (productsRes.data as CatalogProduct[]) : []);
    } catch {
      toast.error('Failed to load dealer dashboard');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const role = getRole();
    if (!role) {
      router.replace('/login');
      return;
    }
    if (role !== 'dealer') {
      router.replace('/shop');
      return;
    }
    const timer = setTimeout(() => {
      void load();
    }, 0);
    return () => clearTimeout(timer);
  }, [router, load]);

  const dealerIdentity = useMemo(() => {
    const token = getToken();
    const payload = token ? parseJwt(token) : null;
    const email = String(payload?.email || '');
    const company = dealerNameFromEmail(email);
    const branded = company === 'Dealer account' ? company : `${company} Cameras`;
    return { company: branded, initials: initials(company), email };
  }, []);

  const computed = useMemo(() => {
    const successful = orders.filter((o) => String(o.status || '').toLowerCase() !== 'payment_failed');
    const totalSpent = successful.reduce((sum, o) => sum + Number(o.total_amount || 0), 0);

    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();
    const prev = new Date(year, month - 1, 1);

    const spentForMonth = (y: number, m: number) =>
      successful.reduce((sum, o) => {
        if (!o.created_at) return sum;
        const d = new Date(o.created_at);
        if (d.getFullYear() === y && d.getMonth() === m) return sum + Number(o.total_amount || 0);
        return sum;
      }, 0);

    const thisMonthSpend = spentForMonth(year, month);
    const prevMonthSpend = spentForMonth(prev.getFullYear(), prev.getMonth());
    const spendDelta = prevMonthSpend > 0 ? Math.round(((thisMonthSpend - prevMonthSpend) / prevMonthSpend) * 100) : 0;

    const allSubOrders = successful.flatMap((o) => o.sub_orders || []);
    const activeSub = allSubOrders.filter((s) => {
      const st = String(s.status || '').toLowerCase();
      return !['delivered', 'order_cancelled', 'payment_failed'].includes(st);
    });
    const inTransit = allSubOrders.filter((s) => {
      const st = String(s.status || '').toLowerCase();
      return st === 'in_transit' || st === 'out_for_delivery';
    }).length;

    const gstInvoices = Array.from(
      new Set(
        allSubOrders
          .map((s) => s.gst_invoice_url)
          .filter((u): u is string => !!u),
      ),
    );

    const priceMap = new Map(
      products
        .filter((p) => p.name)
        .map((p) => [
          String(p.name).toLowerCase().trim(),
          {
            retail: Number(p.mrp || p.price_customer || 0),
            dealer: Number(p.price_dealer || 0),
          },
        ]),
    );

    const estimatedSavings = successful.reduce((sum, o) => {
      const sub = o.sub_orders || [];
      for (const s of sub) {
        for (const it of s.items || []) {
          const key = String(it.product_name || '').toLowerCase().trim();
          const pricing = priceMap.get(key);
          if (!pricing) continue;
          const diff = pricing.retail - pricing.dealer;
          if (diff > 0) sum += diff * Number(it.quantity || 1);
        }
      }
      return sum;
    }, 0);

    const recentRows = successful.slice(0, 6).map((o) => {
      const sub = (o.sub_orders || [])[0];
      const firstItem = (sub?.items || [])[0];
      const qty = (sub?.items || []).reduce((sum, i) => sum + Number(i.quantity || 0), 0);
      const invoice = sub?.gst_invoice_url || null;
      return {
        id: o.id,
        product: firstItem?.product_name || 'Mixed products',
        qty: qty || Number(firstItem?.quantity || 1),
        amount: Number(sub?.total_amount ?? o.total_amount ?? 0),
        status: normalizeStatus(sub?.status || o.status),
        invoice,
      };
    });

    const topProducts = products
      .filter((p) => {
        const retail = Number(p.mrp || p.price_customer || 0);
        const dealer = Number(p.price_dealer || 0);
        return retail > 0 && dealer > 0 && retail >= dealer;
      })
      .map((p) => {
        const retail = Number(p.mrp || p.price_customer || 0);
        const dealer = Number(p.price_dealer || 0);
        return {
          id: p.id,
          name: p.name || 'Product',
          retail,
          dealer,
          save: Math.max(0, retail - dealer),
        };
      })
      .sort((a, b) => b.save - a.save)
      .slice(0, 3);

    return {
      totalSpent,
      thisMonthSpend,
      spendDelta,
      activeOrders: activeSub.length,
      inTransit,
      estimatedSavings,
      gstInvoicesCount: gstInvoices.length,
      recentRows,
      topProducts,
    };
  }, [orders, products]);

  async function downloadAllGstInvoicesZip() {
    if (!computed.gstInvoicesCount) {
      toast.error('No GST tax invoices available yet');
      return;
    }
    setDownloading(true);
    try {
      const res = await ordersApi.downloadGstInvoicesZip();
      const blob = new Blob([res.data as BlobPart], { type: 'application/zip' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'gst-tax-invoices.zip';
      a.rel = 'noopener';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success('GST invoices ZIP downloaded');
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Could not download GST invoices'));
    } finally {
      setDownloading(false);
    }
  }

  const nav = [
    { href: '/dealer/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/shop', label: 'Browse', icon: Store },
    { href: '/orders', label: 'My orders', icon: ShoppingBag, badge: computed.activeOrders },
    { href: '/dealer/invoices', label: 'Invoices', icon: FileText },
    { href: '/dealer/service', label: 'Service', icon: LifeBuoy },
    { href: '/dealer/account', label: 'Account', icon: UserRound },
  ];

  const dealerSidebar = (
    <>
      <div className="p-5 border-b ev-sidebar-border shrink-0">
        <Link href="/dealer/dashboard" className="flex items-center gap-2.5">
          <EvisionLogo variant="mark" height={36} className="shrink-0 shadow-ev-glow rounded-lg" />
          <div className="min-w-0">
            <p className="text-white font-bold text-sm truncate">e vision Pro</p>
            <p className="ev-sidebar-muted text-xs">Dealer dashboard</p>
          </div>
        </Link>
      </div>
      <nav className="p-3 space-y-0.5">
        {nav.map(({ href, label, icon: Icon, badge }) => {
          const active = pathname === href;
          return (
            <Link
              key={label}
              href={href}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                active ? 'ev-sidebar-link-active' : 'ev-sidebar-link'
              }`}
            >
              <Icon size={17} />
              <span className="flex-1 min-w-0 truncate">{label}</span>
              {badge && badge > 0 ? (
                <span className="shrink-0 min-w-[1.25rem] h-5 px-1 flex items-center justify-center rounded-full bg-ev-primary text-white text-[10px] font-bold">
                  {badge > 99 ? '99+' : badge}
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>
      <div className="p-3 border-t ev-sidebar-border shrink-0">
        <button
          type="button"
          onClick={() => {
            clearAuth();
            router.push('/login');
          }}
          className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-white/65 hover:text-red-300 hover:bg-red-500/10 text-sm transition-colors"
        >
          <LogOut size={16} />
          Sign out
        </button>
      </div>
    </>
  );

  return (
    <ResponsiveSidebarShell mobileTopBarTitle={dealerIdentity.company} sidebar={dealerSidebar}>
      <div className="mx-auto min-h-screen min-w-0 w-full max-w-6xl space-y-6 sm:space-y-8">
        {loading ? (
          <div className="flex items-center gap-2 text-ev-muted py-20">
            <Loader2 className="animate-spin text-ev-primary" size={22} />
            Loading dashboard...
          </div>
        ) : (
          <>
            <header className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-ev-text">{dealerIdentity.company}</h1>
                <p className="text-ev-muted text-sm mt-1">Dealer account · GST verified</p>
                <Link href="/shop" className="text-ev-primary text-sm font-medium hover:underline inline-flex mt-2">
                  Browse dealer prices
                </Link>
              </div>
              <div className="w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center text-white text-sm font-bold shadow-ev-md">
                {dealerIdentity.initials}
              </div>
            </header>

            <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              <div className="ev-card p-5">
                <p className="text-ev-muted text-xs font-medium uppercase tracking-wide mb-1">Total spent</p>
                <p className="text-2xl font-bold text-ev-text tabular-nums">{formatInr(computed.totalSpent)}</p>
                <p className="text-ev-muted text-xs mt-2">
                  <span className={computed.spendDelta >= 0 ? 'text-ev-success' : 'text-ev-error'}>
                    {computed.spendDelta >= 0 ? '↑' : '↓'} {Math.abs(computed.spendDelta)}%
                  </span>{' '}
                  this month
                </p>
              </div>
              <Link href="/orders" className="ev-card p-5 hover:border-ev-primary/25 transition-colors block">
                <p className="text-ev-muted text-xs font-medium uppercase tracking-wide mb-1">Active orders</p>
                <p className="text-2xl font-bold text-ev-text tabular-nums">{computed.activeOrders}</p>
                <p className="text-ev-muted text-xs mt-2">{computed.inTransit} in transit</p>
              </Link>
              <div className="ev-card p-5">
                <p className="text-ev-muted text-xs font-medium uppercase tracking-wide mb-1">Total saved vs MRP</p>
                <p className="text-2xl font-bold text-ev-text tabular-nums">{formatInr(computed.estimatedSavings)}</p>
                <p className="text-ev-muted text-xs mt-2">Estimated from catalogue MRP / retail</p>
              </div>
              <Link href="/dealer/invoices" className="ev-card p-5 hover:border-ev-primary/25 transition-colors block">
                <p className="text-ev-muted text-xs font-medium uppercase tracking-wide mb-1">GST tax invoices</p>
                <p className="text-2xl font-bold text-ev-text tabular-nums">{computed.gstInvoicesCount}</p>
                <p className="text-ev-muted text-xs mt-2 inline-flex items-center gap-1">
                  <FileText size={12} />
                  View & download
                </p>
              </Link>
            </section>

            <section className="ev-card overflow-hidden">
              <div className="px-5 py-4 border-b border-ev-border flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-ev-text font-semibold">Recent bulk orders</h2>
                <button
                  type="button"
                  onClick={() => void downloadAllGstInvoicesZip()}
                  className="text-sm text-ev-primary font-medium inline-flex items-center gap-1 hover:underline disabled:opacity-50"
                  disabled={downloading || !computed.gstInvoicesCount}
                >
                  {downloading ? 'Preparing ZIP…' : 'Download all GST invoices (ZIP)'}
                  <ArrowRight size={14} />
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-ev-border text-left bg-ev-surface2/50">
                      {['Order', 'Products', 'Qty', 'Dealer price', 'Status', 'Invoice'].map((h) => (
                        <th key={h} className="px-4 py-3 text-ev-muted text-xs font-medium uppercase tracking-wide whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ev-border">
                    {computed.recentRows.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-10 text-center text-ev-muted">
                          No dealer orders yet.
                        </td>
                      </tr>
                    ) : (
                      computed.recentRows.map((row) => (
                        <tr key={row.id} className="hover:bg-ev-surface2/40">
                          <td className="px-4 py-3 font-mono text-xs text-ev-text">{orderLabel(row.id)}</td>
                          <td className="px-4 py-3 text-ev-text">{row.product}</td>
                          <td className="px-4 py-3 text-ev-muted">x{row.qty}</td>
                          <td className="px-4 py-3 font-semibold whitespace-nowrap">{formatInr(row.amount)}</td>
                          <td className="px-4 py-3 text-ev-muted">{row.status}</td>
                          <td className="px-4 py-3">
                            {row.invoice ? (
                              <a
                                href={row.invoice}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-ev-primary text-xs font-medium hover:underline"
                              >
                                <Download size={12} />
                                GST
                              </a>
                            ) : (
                              <span className="text-ev-subtle text-xs">—</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="ev-card p-5">
              <h2 className="text-ev-text font-semibold mb-4">Top products — dealer pricing</h2>
              {computed.topProducts.length === 0 ? (
                <p className="text-ev-muted text-sm">No dealer-priced products available yet.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {computed.topProducts.map((p) => (
                    <Link
                      key={p.id}
                      href="/shop"
                      className="rounded-xl border border-ev-border bg-ev-surface2/40 p-4 hover:border-ev-primary/25 transition-colors"
                    >
                      <p className="text-ev-text font-medium">{p.name}</p>
                      <p className="text-ev-subtle text-xs line-through mt-1">{formatInr(p.retail)}</p>
                      <p className="text-ev-text text-lg font-semibold">{formatInr(p.dealer)}</p>
                      <p className="text-ev-success text-xs font-medium mt-1">Save {formatInr(p.save)}</p>
                    </Link>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </ResponsiveSidebarShell>
  );
}
