'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Zap,
  TrendingUp,
  Package,
  Receipt,
  Download,
  Loader2,
  ShoppingBag,
  LogOut,
  ChevronRight,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { ordersApi } from '@/lib/api';
import { clearAuth, getRole } from '@/lib/auth';

type OrderItem = {
  id: string;
  product_name?: string;
  quantity?: number;
  line_total?: number;
};

type SubOrder = {
  id: string;
  admin_id: string;
  shop_name?: string | null;
  status?: string;
  total_amount?: number;
  items: OrderItem[];
  customer_invoice_url?: string | null;
  dealer_invoice_url?: string | null;
  gst_invoice_url?: string | null;
};

type OrderGroup = {
  id: string;
  status?: string;
  total_amount?: number;
  created_at?: string;
  sub_orders: SubOrder[];
};

function formatInr(n: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(n);
}

export default function DealerDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<OrderGroup[]>([]);
  const [downloading, setDownloading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await ordersApi.myOrders();
      setOrders(Array.isArray(data) ? (data as OrderGroup[]) : []);
    } catch {
      toast.error('Failed to load dashboard data');
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

  const analytics = useMemo(() => {
    const confirmed = orders.filter((g) => g.status !== 'payment_failed');
    const totalSpend = confirmed.reduce((sum, g) => sum + Number(g.total_amount || 0), 0);
    const totalOrders = confirmed.length;
    const avgOrderValue = totalOrders ? totalSpend / totalOrders : 0;

    const invoiceUrls = Array.from(
      new Set(
        confirmed.flatMap((g) =>
          (g.sub_orders || []).flatMap((sub) =>
            [sub.dealer_invoice_url, sub.gst_invoice_url, sub.customer_invoice_url].filter(
              (u): u is string => !!u,
            ),
          ),
        ),
      ),
    );

    return { totalSpend, totalOrders, avgOrderValue, invoiceUrls };
  }, [orders]);

  function bulkDownloadInvoices() {
    if (!analytics.invoiceUrls.length) {
      toast.error('No invoice URLs available yet');
      return;
    }
    setDownloading(true);
    for (const url of analytics.invoiceUrls) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
    toast.success(`Opened ${analytics.invoiceUrls.length} invoice link${analytics.invoiceUrls.length !== 1 ? 's' : ''}`);
    setDownloading(false);
  }

  function logout() {
    clearAuth();
    router.push('/login');
  }

  return (
    <div className="min-h-screen bg-ev-bg">
      <header className="border-b border-ev-border bg-ev-surface/90 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-gradient-primary rounded-lg flex items-center justify-center shadow-ev-glow shrink-0">
              <Zap size={18} className="text-white" />
            </div>
            <div>
              <p className="text-ev-text font-bold text-sm">Dealer Dashboard</p>
              <p className="text-ev-subtle text-[11px]">Spend analytics &amp; invoices</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/shop" className="ev-btn-secondary text-sm py-2 px-3 inline-flex items-center gap-1.5">
              <ShoppingBag size={14} />
              Shop
            </Link>
            <Link href="/orders" className="ev-btn-secondary text-sm py-2 px-3">
              Orders
            </Link>
            <button
              type="button"
              onClick={logout}
              className="ev-btn-secondary text-sm py-2 px-3 inline-flex items-center gap-1.5"
            >
              <LogOut size={14} />
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {loading ? (
          <div className="flex items-center gap-2 text-ev-muted justify-center py-24">
            <Loader2 className="animate-spin text-ev-primary" size={24} />
            Loading dashboard...
          </div>
        ) : (
          <>
            {/* Analytics cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <div className="ev-card p-5">
                <div className="flex items-start justify-between mb-2">
                  <p className="text-ev-muted text-xs uppercase tracking-wide font-medium">Total Spend</p>
                  <TrendingUp size={16} className="text-ev-primary opacity-60" />
                </div>
                <p className="text-2xl font-bold text-ev-text">{formatInr(analytics.totalSpend)}</p>
                <p className="text-ev-subtle text-xs mt-1">All confirmed orders</p>
              </div>

              <div className="ev-card p-5">
                <div className="flex items-start justify-between mb-2">
                  <p className="text-ev-muted text-xs uppercase tracking-wide font-medium">Orders Placed</p>
                  <Package size={16} className="text-ev-primary opacity-60" />
                </div>
                <p className="text-2xl font-bold text-ev-text">{analytics.totalOrders}</p>
                <p className="text-ev-subtle text-xs mt-1">Successful payments</p>
              </div>

              <div className="ev-card p-5">
                <div className="flex items-start justify-between mb-2">
                  <p className="text-ev-muted text-xs uppercase tracking-wide font-medium">Avg Order Value</p>
                  <TrendingUp size={16} className="text-ev-primary opacity-60" />
                </div>
                <p className="text-2xl font-bold text-ev-text">{formatInr(analytics.avgOrderValue)}</p>
                <p className="text-ev-subtle text-xs mt-1">Per order group</p>
              </div>

              <div className="ev-card p-5">
                <div className="flex items-start justify-between mb-2">
                  <p className="text-ev-muted text-xs uppercase tracking-wide font-medium">Invoices</p>
                  <Receipt size={16} className="text-ev-primary opacity-60" />
                </div>
                <p className="text-2xl font-bold text-ev-text">{analytics.invoiceUrls.length}</p>
                <button
                  type="button"
                  onClick={bulkDownloadInvoices}
                  disabled={downloading || !analytics.invoiceUrls.length}
                  className="mt-2 ev-btn-primary text-xs py-1.5 px-3 inline-flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {downloading ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    <Download size={12} />
                  )}
                  {downloading ? 'Opening...' : 'Bulk Download'}
                </button>
              </div>
            </div>

            {/* Recent orders */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-ev-text font-semibold text-lg">Recent Orders</h2>
                <Link
                  href="/orders"
                  className="text-ev-primary text-sm inline-flex items-center gap-1 hover:text-ev-primary-light transition-colors"
                >
                  View all <ChevronRight size={14} />
                </Link>
              </div>

              {orders.length === 0 ? (
                <div className="ev-card p-16 text-center text-ev-muted">
                  <Package className="mx-auto mb-3 opacity-30" size={36} />
                  <p className="text-ev-text font-medium mb-1">No orders yet</p>
                  <p className="text-sm">Place your first dealer order from the catalogue.</p>
                  <Link
                    href="/shop"
                    className="ev-btn-primary mt-4 inline-flex items-center gap-2 text-sm py-2.5 px-5"
                  >
                    Browse catalogue
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {orders.slice(0, 8).map((group) => {
                    const subInvoices = (group.sub_orders || []).flatMap((sub) =>
                      [sub.dealer_invoice_url, sub.gst_invoice_url, sub.customer_invoice_url].filter(
                        (u): u is string => !!u,
                      ),
                    );
                    const isFailure = group.status === 'payment_failed';
                    return (
                      <article
                        key={group.id}
                        className={`ev-card p-5 ${isFailure ? 'opacity-60' : ''}`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <p className="text-ev-text font-medium text-sm">
                              Order #{group.id.slice(-8).toUpperCase()}
                            </p>
                            <p className="text-ev-subtle text-xs">
                              {group.created_at
                                ? new Date(group.created_at).toLocaleDateString('en-IN', {
                                    day: 'numeric',
                                    month: 'short',
                                    year: 'numeric',
                                  })
                                : '—'}
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-ev-primary font-semibold text-sm">
                              {formatInr(Number(group.total_amount || 0))}
                            </span>
                            <span className="ev-badge">{group.status || '—'}</span>
                          </div>
                        </div>

                        {subInvoices.length > 0 && (
                          <div className="flex flex-wrap gap-2 pt-2 border-t border-ev-border mt-2">
                            {subInvoices.map((url, i) => (
                              <a
                                key={i}
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 text-xs text-ev-primary border border-ev-primary/20 rounded-lg px-3 py-1.5 hover:bg-ev-primary/5 transition-colors"
                              >
                                <Download size={11} />
                                Invoice {i + 1}
                              </a>
                            ))}
                          </div>
                        )}
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}
