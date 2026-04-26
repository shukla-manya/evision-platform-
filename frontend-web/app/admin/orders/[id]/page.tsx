'use client';

import { use, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Loader2, Truck, ExternalLink, FileText, MapPin } from 'lucide-react';
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
    gst_no?: string;
  } | null;
  items?: OrderItem[];
  order_group?: { id?: string; status?: string; total_amount?: number } | null;
  delivery_address?: {
    name: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    pincode: string;
  } | null;
  invoices?: Array<{
    id?: string;
    invoice_number?: string;
    customer_invoice_url?: string;
    dealer_invoice_url?: string;
    gst_invoice_url?: string;
  }>;
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

function orderDisplayRef(id: string) {
  const tail = id.replace(/\D/g, '').slice(-6).padStart(6, '0');
  return `#${tail}`;
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

  const buyerType = useMemo(() => {
    const r = String(order?.customer?.role || '').toLowerCase();
    return r === 'dealer' ? 'Dealer' : 'Customer';
  }, [order]);

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
      <main className="w-full min-w-0 max-w-3xl">
        <Link href="/admin/orders" className="text-ev-muted text-sm inline-flex items-center gap-1 hover:text-ev-text mb-4">
          <ArrowLeft size={14} /> All orders
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
                  <p className="text-ev-subtle text-xs uppercase tracking-wide mb-1">Order number</p>
                  <h1 className="text-xl font-bold text-ev-text">{orderDisplayRef(order.id)}</h1>
                  <p className="text-ev-muted text-xs font-mono mt-1 break-all">{order.id}</p>
                  <p className="text-ev-muted text-sm mt-2">Placed: {fmt(order.created_at)}</p>
                  <p className="text-ev-muted text-sm mt-1">
                    Buyer type: <span className="text-ev-text font-medium">{buyerType}</span>
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-ev-subtle text-xs uppercase tracking-wide">Shop order total</p>
                  {order.total_amount != null ? (
                    <p className="text-ev-primary font-semibold text-2xl mt-1">
                      ₹{Number(order.total_amount).toLocaleString('en-IN')}
                    </p>
                  ) : null}
                  <p className="text-ev-muted text-xs mt-2">Fulfilment status</p>
                  <p className="text-ev-text font-semibold">{order.status || '—'}</p>
                </div>
              </div>
            </section>

            <section className="ev-card p-6">
              <h2 className="text-ev-text font-semibold mb-3 flex items-center gap-2">
                <MapPin size={18} className="text-ev-primary" />
                Delivery address
              </h2>
              {order.delivery_address ? (
                <div className="text-sm space-y-1 text-ev-text">
                  <p className="font-medium">{order.delivery_address.name}</p>
                  <p className="text-ev-muted">{order.delivery_address.phone}</p>
                  <p>{order.delivery_address.address}</p>
                  <p>
                    {order.delivery_address.city}, {order.delivery_address.state} {order.delivery_address.pincode}
                  </p>
                </div>
              ) : (
                <p className="text-ev-muted text-sm">No delivery address on file.</p>
              )}
            </section>

            <section className="ev-card p-6">
              <h2 className="text-ev-text font-semibold mb-3">Buyer</h2>
              <div className="grid sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-ev-subtle text-xs">Name</p>
                  <p className="text-ev-text">{order.customer?.name || '—'}</p>
                </div>
                <div>
                  <p className="text-ev-subtle text-xs">Type</p>
                  <p className="text-ev-text">{buyerType}</p>
                </div>
                <div>
                  <p className="text-ev-subtle text-xs">Email</p>
                  <p className="text-ev-text">{order.customer?.email || '—'}</p>
                </div>
                <div>
                  <p className="text-ev-subtle text-xs">Phone</p>
                  <p className="text-ev-text">{order.customer?.phone || '—'}</p>
                </div>
                {order.customer?.gst_no ? (
                  <div className="sm:col-span-2">
                    <p className="text-ev-subtle text-xs">Buyer GST</p>
                    <p className="text-ev-text">{order.customer.gst_no}</p>
                  </div>
                ) : null}
              </div>
            </section>

            <section className="ev-card p-6">
              <h2 className="text-ev-text font-semibold mb-3">Items &amp; pricing</h2>
              <div className="space-y-2">
                {(order.items || []).map((it) => (
                  <div key={it.id} className="rounded-xl border border-ev-border p-3 flex items-center justify-between text-sm">
                    <div>
                      <p className="text-ev-text">{it.product_name || 'Product'}</p>
                      <p className="text-ev-muted text-xs">
                        Qty {it.quantity || 1} × ₹{Number(it.unit_price || 0).toLocaleString('en-IN')}
                      </p>
                    </div>
                    <p className="text-ev-text font-semibold">₹{Number(it.line_total || 0).toLocaleString('en-IN')}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="ev-card p-6">
              <h2 className="text-ev-text font-semibold mb-3">Payment</h2>
              <div className="text-sm space-y-2">
                <p>
                  <span className="text-ev-muted">Order group: </span>
                  <span className="font-mono text-xs">{order.order_group?.id || '—'}</span>
                </p>
                <p>
                  <span className="text-ev-muted">Group status: </span>
                  <span className="text-ev-text font-medium">{order.order_group?.status || '—'}</span>
                </p>
                <p className="text-ev-muted text-xs">
                  Razorpay and payout timing are managed by the platform. Contact support for settlement questions.
                </p>
              </div>
            </section>

            <section className="ev-card p-6">
              <h2 className="text-ev-text font-semibold mb-3">Shipment</h2>
              <div className="grid sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-ev-subtle text-xs">AWB number</p>
                  <p className="text-ev-text font-mono">{order.awb_number || 'Not generated'}</p>
                </div>
                <div>
                  <p className="text-ev-subtle text-xs">Courier</p>
                  <p className="text-ev-text">{order.courier_name || '—'}</p>
                </div>
                <div>
                  <p className="text-ev-subtle text-xs">Shipped at</p>
                  <p className="text-ev-text">{fmt(order.shipped_at)}</p>
                </div>
                <div>
                  <p className="text-ev-subtle text-xs">Shipment tracking</p>
                  {order.tracking_url ? (
                    <a
                      href={order.tracking_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-ev-primary inline-flex items-center gap-1 hover:underline"
                    >
                      Open tracking <ExternalLink size={13} />
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
                  {shipping ? 'Generating...' : 'Generate shipment'}
                </button>
                <p className="text-ev-muted text-xs mt-2">Uses buyer address on file when fields are left empty in the API.</p>
              </div>
            </section>

            <section className="ev-card p-6">
              <h2 className="text-ev-text font-semibold mb-3 flex items-center gap-2">
                <FileText size={18} className="text-ev-primary" />
                Invoices
              </h2>
              {!order.invoices?.length ? (
                <p className="text-ev-muted text-sm">No invoice PDFs generated for this order yet.</p>
              ) : (
                <ul className="space-y-3 text-sm">
                  {order.invoices.map((inv) => (
                    <li key={String(inv.id)} className="border border-ev-border rounded-xl p-3 flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="font-mono text-ev-text font-semibold">{inv.invoice_number || inv.id}</p>
                        <p className="text-ev-muted text-xs">Order-linked invoice</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {inv.customer_invoice_url ? (
                          <a
                            href={inv.customer_invoice_url}
                            target="_blank"
                            rel="noreferrer"
                            className="ev-btn-secondary text-xs py-1.5 px-3 inline-flex items-center gap-1"
                          >
                            <FileText size={12} /> Customer PDF
                          </a>
                        ) : null}
                        {inv.dealer_invoice_url ? (
                          <a
                            href={inv.dealer_invoice_url}
                            target="_blank"
                            rel="noreferrer"
                            className="ev-btn-secondary text-xs py-1.5 px-3 inline-flex items-center gap-1"
                          >
                            Dealer PDF
                          </a>
                        ) : null}
                        {inv.gst_invoice_url ? (
                          <a
                            href={inv.gst_invoice_url}
                            target="_blank"
                            rel="noreferrer"
                            className="ev-btn-secondary text-xs py-1.5 px-3 inline-flex items-center gap-1"
                          >
                            GST PDF
                          </a>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        )}
      </main>
    </AdminShell>
  );
}
