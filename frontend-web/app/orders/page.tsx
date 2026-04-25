'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Loader2, PackageCheck, ChevronDown, ChevronUp, Ban, Download } from 'lucide-react';
import toast from 'react-hot-toast';
import { ordersApi } from '@/lib/api';
import { getRole } from '@/lib/auth';

type OrderItem = {
  id: string;
  product_name?: string;
  quantity?: number;
  unit_price?: number;
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

const cancelableStatuses = new Set(['payment_confirmed', 'order_received']);

export default function MyOrdersPage() {
  const role = typeof window !== 'undefined' ? getRole() : undefined;
  const canUseOrders = useMemo(() => role === 'customer' || role === 'dealer', [role]);
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<OrderGroup[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await ordersApi.myOrders();
      setRows(Array.isArray(data) ? (data as OrderGroup[]) : []);
    } catch {
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!canUseOrders) return;
    const timer = setTimeout(() => {
      void load();
    }, 0);
    return () => clearTimeout(timer);
  }, [canUseOrders, load]);

  async function cancel(groupId: string) {
    if (!confirm('Cancel this entire order group?')) return;
    setCancelling(groupId);
    try {
      await ordersApi.cancelOrderGroup(groupId);
      toast.success('Order group cancelled');
      await load();
    } catch {
      toast.error('Could not cancel this order');
    } finally {
      setCancelling(null);
    }
  }

  if (!canUseOrders) {
    return (
      <div className="min-h-screen bg-ev-bg flex items-center justify-center text-ev-muted">
        Sign in as customer or dealer to view orders.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ev-bg">
      <header className="border-b border-ev-border bg-ev-surface/90 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div>
            <h1 className="text-ev-text font-bold text-base sm:text-lg">My orders</h1>
            <p className="text-ev-subtle text-xs">Order groups with per-shop tracking</p>
          </div>
          <div className="flex items-center gap-2">
            <Link href={`/reset-password?role=${role === 'dealer' ? 'dealer' : 'customer'}`} className="ev-btn-secondary py-2 px-3 text-sm">
              Change Password
            </Link>
            <Link href="/shop" className="ev-btn-secondary py-2 px-3 text-sm">Browse</Link>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {loading ? (
          <div className="flex items-center gap-2 text-ev-muted justify-center py-24">
            <Loader2 className="animate-spin text-ev-primary" size={22} />
            Loading orders...
          </div>
        ) : rows.length === 0 ? (
          <div className="ev-card p-16 text-center text-ev-muted">
            <PackageCheck className="mx-auto mb-3 opacity-30" size={40} />
            <p className="text-ev-text font-medium mb-1">No orders yet</p>
            <p className="text-sm">Place your first order from the shop.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {rows.map((group) => (
              <article key={group.id} className="ev-card overflow-hidden">
                <button
                  type="button"
                  className="w-full p-5 flex items-center justify-between text-left hover:bg-ev-surface2/60"
                  onClick={() => setExpanded(expanded === group.id ? null : group.id)}
                >
                  <div>
                    <p className="text-ev-text font-semibold text-sm">Order Group {group.id}</p>
                    <p className="text-ev-muted text-xs">
                      {group.created_at ? new Date(group.created_at).toLocaleString() : '—'}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-ev-primary font-semibold text-sm">{formatInr(Number(group.total_amount || 0))}</span>
                    <span className="ev-badge">{group.status || '—'}</span>
                    {expanded === group.id ? <ChevronUp size={16} className="text-ev-muted" /> : <ChevronDown size={16} className="text-ev-muted" />}
                  </div>
                </button>
                {expanded === group.id ? (
                  <div className="border-t border-ev-border p-5 bg-ev-surface2 space-y-3">
                    {group.sub_orders?.map((sub) => (
                      <div key={sub.id} className="rounded-xl border border-ev-border p-4">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-ev-text font-medium">{sub.shop_name || sub.admin_id}</p>
                          <div className="text-right">
                            <p className="text-ev-text font-semibold">{formatInr(Number(sub.total_amount || 0))}</p>
                            <p className="text-ev-subtle text-xs">{sub.status || '—'}</p>
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          {sub.items?.map((it) => (
                            <div key={it.id} className="flex items-center justify-between text-sm">
                              <span className="text-ev-muted truncate">
                                {it.product_name || 'Product'} x {it.quantity || 1}
                              </span>
                              <span className="text-ev-text">{formatInr(Number(it.line_total || 0))}</span>
                            </div>
                          ))}
                        </div>
                        {(role === 'dealer' || role === 'customer') && (() => {
                          const invoices = [sub.dealer_invoice_url, sub.gst_invoice_url, sub.customer_invoice_url].filter((u): u is string => !!u);
                          return invoices.length > 0 ? (
                            <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-ev-border">
                              {invoices.map((url, i) => (
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
                          ) : null;
                        })()}
                      </div>
                    ))}
                    {cancelableStatuses.has(String(group.status || '')) ? (
                      <button
                        type="button"
                        onClick={() => void cancel(group.id)}
                        disabled={cancelling === group.id}
                        className="inline-flex items-center gap-2 text-sm px-4 py-2.5 rounded-xl border border-ev-error/30 text-ev-error hover:bg-ev-error/10"
                      >
                        {cancelling === group.id ? <Loader2 size={14} className="animate-spin" /> : <Ban size={14} />}
                        Cancel order group
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
