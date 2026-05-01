'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ChevronDown,
  ChevronUp,
  Download,
  Loader2,
  Package,
  Ban,
  Truck,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { ordersApi } from '@/lib/api';
import { getRole } from '@/lib/auth';
import { PublicShell } from '@/components/public/PublicShell';

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
  awb_number?: string | null;
  courier_name?: string | null;
  tracking_url?: string | null;
  customer_invoice_url?: string | null;
  dealer_invoice_url?: string | null;
  gst_invoice_url?: string | null;
};

type OrderGroup = {
  id: string;
  status?: string;
  total_amount?: number;
  created_at?: string;
  group_display_id?: string;
  shipment_count?: number;
  line_item_units?: number;
  sub_orders: SubOrder[];
};

function formatInr(n: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(n);
}

function groupLabel(g: OrderGroup) {
  if (g.group_display_id) return g.group_display_id;
  const tail = g.id.replace(/-/g, '').slice(-4).toUpperCase();
  return `G${tail}`;
}

const cancelableStatuses = new Set(['payment_confirmed', 'order_received']);

const TRACK_STEPS = ['Confirmed', 'Packed', 'Shipped', 'Out for delivery', 'Delivered'] as const;

function trackingStepIndex(status?: string): number {
  const s = String(status || '').toLowerCase();
  if (s === 'delivered') return 4;
  if (s === 'out_for_delivery') return 3;
  if (s === 'in_transit' || s === 'picked_up') return 2;
  if (s === 'shipment_created') return 2;
  if (s === 'order_received') return 1;
  if (s === 'payment_confirmed') return 0;
  return 0;
}

function TrackingBar({ status }: { status?: string }) {
  const idx = trackingStepIndex(status);
  return (
    <div className="mt-3">
      <div className="flex justify-between text-[10px] uppercase tracking-wide text-ev-subtle mb-1.5">
        {TRACK_STEPS.map((label) => (
          <span key={label} className="flex-1 text-center px-0.5">
            {label}
          </span>
        ))}
      </div>
      <div className="flex gap-1">
        {TRACK_STEPS.map((_, i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full ${i <= idx ? 'bg-ev-primary' : 'bg-ev-border'}`}
          />
        ))}
      </div>
    </div>
  );
}

function statusBadge(status?: string) {
  const s = String(status || '').toLowerCase();
  if (s === 'delivered') return 'bg-ev-success/15 text-ev-success border-ev-success/25';
  if (s === 'order_cancelled' || s === 'payment_failed') return 'bg-ev-error/10 text-ev-error border-ev-error/20';
  if (s === 'out_for_delivery' || s === 'in_transit' || s === 'shipment_created') {
    return 'bg-ev-primary/10 text-ev-primary border-ev-primary/25';
  }
  return 'bg-ev-surface2 text-ev-muted border-ev-border';
}

export default function MyOrdersPage() {
  const role = typeof window !== 'undefined' ? getRole() : undefined;
  const canUseOrders = useMemo(() => role === 'customer' || role === 'dealer', [role]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [rows, setRows] = useState<OrderGroup[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const { data } = await ordersApi.myOrders();
      setRows(Array.isArray(data) ? (data as OrderGroup[]) : []);
    } catch {
      setLoadError(true);
      setRows([]);
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!canUseOrders) return;
    void load();
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
      <PublicShell>
        <main className="max-w-lg mx-auto px-4 py-20 text-center text-ev-muted">
          Sign in as a customer or dealer to view orders.
        </main>
      </PublicShell>
    );
  }

  const inner = (
    <>
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-ev-text">My orders</h1>
          <p className="text-ev-muted text-sm mt-1">
            Grouped by checkout: each order group can include several shops. Expand a group for shipments, tracking, and
            invoices (GST tax invoices for dealers when available).
          </p>
        </div>
        <Link href="/shop" className="ev-btn-secondary text-sm py-2 px-4 self-start">
          Start shopping
        </Link>
      </div>

      {loadError && !loading ? (
        <div className="ev-card p-12 text-center space-y-4">
          <p className="text-ev-text font-medium">We couldn&apos;t load your orders.</p>
          <p className="text-ev-muted text-sm">Check your connection or try again shortly.</p>
          <button type="button" className="ev-btn-primary text-sm py-2 px-5" onClick={() => void load()}>
            Try again
          </button>
        </div>
      ) : loading ? (
        <div className="flex items-center gap-2 text-ev-muted justify-center py-24">
          <Loader2 className="animate-spin text-ev-primary" size={22} />
          Loading orders…
        </div>
      ) : rows.length === 0 ? (
        <div className="ev-card p-16 text-center text-ev-muted">
          <Package className="mx-auto mb-3 opacity-30" size={40} />
          <p className="text-ev-text font-medium mb-2">You haven&apos;t placed any orders yet.</p>
          <Link href="/shop" className="ev-btn-primary inline-flex mt-4">
            Start shopping
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {rows.map((group) => {
            const shops = group.sub_orders?.length || 0;
            const units =
              group.line_item_units ??
              group.sub_orders?.reduce(
                (a, s) => a + (s.items || []).reduce((b, it) => b + Number(it.quantity || 1), 0),
                0,
              ) ??
              0;
            return (
              <article key={group.id} className="ev-card overflow-hidden">
                <button
                  type="button"
                  className="w-full p-5 flex items-center justify-between text-left hover:bg-ev-surface2/60 gap-3"
                  onClick={() => setExpanded(expanded === group.id ? null : group.id)}
                >
                  <div className="min-w-0">
                    <p className="text-ev-text font-semibold">Order group #{groupLabel(group)}</p>
                    <p className="text-ev-muted text-xs mt-0.5">
                      {group.created_at ? new Date(group.created_at).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      }) : '—'}
                      {units > 0 && shops > 0 ? (
                        <>
                          {' · '}
                          <span className="text-ev-text">
                            {units} {units === 1 ? 'item' : 'items'} from {shops} {shops === 1 ? 'shop' : 'shops'}
                          </span>
                        </>
                      ) : null}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-ev-primary font-semibold text-sm">{formatInr(Number(group.total_amount || 0))}</span>
                    {expanded === group.id ? <ChevronUp size={18} className="text-ev-muted" /> : <ChevronDown size={18} className="text-ev-muted" />}
                  </div>
                </button>
                {expanded === group.id ? (
                  <div className="border-t border-ev-border p-5 bg-ev-surface2 space-y-4">
                    {group.sub_orders?.map((sub) => {
                      const delivered = String(sub.status || '').toLowerCase() === 'delivered';
                      const itemsSummary =
                        sub.items?.map((it) => `${it.product_name || 'Item'} ×${it.quantity || 1}`).join(', ') || '—';
                      const invoices = [
                        sub.customer_invoice_url,
                        sub.dealer_invoice_url,
                        sub.gst_invoice_url,
                      ].filter((u): u is string => !!u);
                      return (
                        <div key={sub.id} className="rounded-xl border border-ev-border p-4 bg-ev-surface">
                          <div className="flex flex-wrap items-start justify-between gap-3 mb-2">
                            <div>
                              <p className="text-ev-text font-semibold">{sub.shop_name || 'Shop'}</p>
                              <p className="text-ev-muted text-xs mt-1">{itemsSummary}</p>
                            </div>
                            <span className={`text-xs font-medium px-2.5 py-1 rounded-lg border capitalize ${statusBadge(sub.status)}`}>
                              {(sub.status || '—').replace(/_/g, ' ')}
                            </span>
                          </div>
                          <TrackingBar status={sub.status} />
                          {sub.awb_number ? (
                            <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
                              <Truck size={14} className="text-ev-muted shrink-0" />
                              <span className="text-ev-muted">Tracking:</span>
                              <span className="font-mono text-ev-text">{sub.awb_number}</span>
                              {sub.courier_name ? <span className="text-ev-muted">· {sub.courier_name}</span> : null}
                              {sub.tracking_url ? (
                                <a
                                  href={sub.tracking_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="ev-btn-secondary text-sm py-2 px-3 inline-flex items-center gap-1.5 shrink-0"
                                >
                                  <Truck size={14} />
                                  Track shipment
                                </a>
                              ) : null}
                            </div>
                          ) : null}
                          {invoices.length > 0 ? (
                            <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-ev-border">
                              {invoices.map((url, i) => (
                                <a
                                  key={i}
                                  href={url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 text-xs text-ev-primary border border-ev-primary/20 rounded-lg px-3 py-1.5 hover:bg-ev-primary/5"
                                >
                                  <Download size={11} />
                                  Download invoice
                                </a>
                              ))}
                            </div>
                          ) : null}
                          {delivered ? (
                            <div className="mt-4">
                              <Link
                                href={`/service/request?sub_order_id=${encodeURIComponent(sub.id)}&product=${encodeURIComponent(
                                  sub.items?.[0]?.product_name || 'Your product',
                                )}`}
                                className="ev-btn-secondary text-sm py-2 px-4 inline-flex"
                              >
                                Request service
                              </Link>
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
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
            );
          })}
        </div>
      )}
    </>
  );

  return (
    <PublicShell>
      <main className="ev-container py-8 w-full min-w-0">{inner}</main>
    </PublicShell>
  );
}
