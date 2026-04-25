'use client';

import { use, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Loader2, Truck, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';
import { adminApi } from '@/lib/api';
import { ADMIN_SHIPPABLE_STATUSES } from '@/lib/admin-orders';
import { AdminShell } from '@/components/admin/AdminShell';

type OrderItem = {
  id: string;
  product_name?: string;
  quantity?: number;
  unit_price?: number;
  line_total?: number;
};

type AdminOrderDetail = {
  id: string;
  status?: string;
  total_amount?: number;
  created_at?: string;
  shipped_at?: string;
  awb_number?: string | null;
  courier_name?: string | null;
  tracking_url?: string | null;
  customer?: {
    id?: string;
    name?: string;
    email?: string;
    phone?: string;
    role?: string;
  } | null;
  items?: OrderItem[];
};

function fmt(iso?: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const shippableStatuses = ADMIN_SHIPPABLE_STATUSES;

export default function AdminOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [order, setOrder] = useState<AdminOrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [shipping, setShipping] = useState(false);

  const canShip = useMemo(
    () => order && shippableStatuses.has(String(order.status || '').toLowerCase()),
    [order],
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await adminApi.getOrder(id);
      setOrder(data as AdminOrderDetail);
    } catch {
      toast.error('Failed to load order detail');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void load();
    }, 0);
    return () => clearTimeout(timer);
  }, [load]);

  return (
    <AdminShell>
      <main className="p-6 sm:p-10">
        <Link href="/admin/orders" className="text-ev-muted text-sm inline-flex items-center gap-1 hover:text-ev-text mb-4">
          <ArrowLeft size={14} /> Orders
        </Link>

        {loading ? (
          <div className="flex items-center gap-2 text-ev-muted py-16">
            <Loader2 className="animate-spin text-ev-primary" size={22} />
            Loading...
          </div>
        ) : !order ? (
          <div className="ev-card p-12 text-center text-ev-muted">Order not found.</div>
        ) : (
          <div className="space-y-6">
            <section className="ev-card p-6">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div>
                  <h1 className="text-xl font-bold text-ev-text">Order {order.id}</h1>
                  <p className="text-ev-muted text-sm mt-1">Placed: {fmt(order.created_at)}</p>
                </div>
                <div className="text-right">
                  <p className="text-ev-subtle text-xs uppercase tracking-wide">Current delivery status</p>
                  <p className="text-ev-text font-semibold text-lg">{order.status || '—'}</p>
                  {order.total_amount != null ? (
                    <p className="text-ev-primary font-semibold mt-1">
                      ₹{Number(order.total_amount).toLocaleString('en-IN')}
                    </p>
                  ) : null}
                </div>
              </div>
            </section>

            <section className="ev-card p-6">
              <h2 className="text-ev-text font-semibold mb-3">Shipment</h2>
              <div className="grid sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-ev-subtle text-xs">AWB Number</p>
                  <p className="text-ev-text font-mono">{order.awb_number || 'Not generated'}</p>
                </div>
                <div>
                  <p className="text-ev-subtle text-xs">Courier</p>
                  <p className="text-ev-text">{order.courier_name || '—'}</p>
                </div>
                <div>
                  <p className="text-ev-subtle text-xs">Shipped At</p>
                  <p className="text-ev-text">{fmt(order.shipped_at)}</p>
                </div>
                <div>
                  <p className="text-ev-subtle text-xs">Tracking</p>
                  {order.tracking_url ? (
                    <a
                      href={order.tracking_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-ev-primary inline-flex items-center gap-1 hover:underline"
                    >
                      Open tracker <ExternalLink size={13} />
                    </a>
                  ) : (
                    <p className="text-ev-text">—</p>
                  )}
                </div>
              </div>
              <div className="mt-5">
                <button
                  type="button"
                  disabled={!canShip || shipping}
                  onClick={async () => {
                    setShipping(true);
                    try {
                      await adminApi.shipOrder(order.id);
                      toast.success('Shipment generated');
                      await load();
                    } catch {
                      toast.error('Could not generate shipment');
                    } finally {
                      setShipping(false);
                    }
                  }}
                  className="ev-btn-primary py-2.5 px-4 inline-flex items-center gap-2 disabled:opacity-50"
                >
                  {shipping ? <Loader2 size={15} className="animate-spin" /> : <Truck size={15} />}
                  {shipping ? 'Generating...' : 'Generate Shipment'}
                </button>
              </div>
            </section>

            <section className="ev-card p-6">
              <h2 className="text-ev-text font-semibold mb-3">Customer</h2>
              <div className="grid sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-ev-subtle text-xs">Name</p>
                  <p className="text-ev-text">{order.customer?.name || '—'}</p>
                </div>
                <div>
                  <p className="text-ev-subtle text-xs">Role</p>
                  <p className="text-ev-text">{order.customer?.role || '—'}</p>
                </div>
                <div>
                  <p className="text-ev-subtle text-xs">Email</p>
                  <p className="text-ev-text">{order.customer?.email || '—'}</p>
                </div>
                <div>
                  <p className="text-ev-subtle text-xs">Phone</p>
                  <p className="text-ev-text">{order.customer?.phone || '—'}</p>
                </div>
              </div>
            </section>

            <section className="ev-card p-6">
              <h2 className="text-ev-text font-semibold mb-3">Items</h2>
              <div className="space-y-2">
                {(order.items || []).map((it) => (
                  <div key={it.id} className="rounded-xl border border-ev-border p-3 flex items-center justify-between text-sm">
                    <div>
                      <p className="text-ev-text">{it.product_name || 'Product'}</p>
                      <p className="text-ev-muted text-xs">
                        Qty: {it.quantity || 1} x ₹{Number(it.unit_price || 0).toLocaleString('en-IN')}
                      </p>
                    </div>
                    <p className="text-ev-text font-semibold">₹{Number(it.line_total || 0).toLocaleString('en-IN')}</p>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}
      </main>
    </AdminShell>
  );
}
