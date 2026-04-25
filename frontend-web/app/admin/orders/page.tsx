'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ShoppingCart, Loader2, Truck, X, Package } from 'lucide-react';
import toast from 'react-hot-toast';
import { adminApi } from '@/lib/api';
import { ADMIN_SHIPPABLE_STATUSES } from '@/lib/admin-orders';
import { AdminShell } from '@/components/admin/AdminShell';

type Order = {
  id: string;
  group_id?: string;
  user_id?: string;
  status?: string;
  total?: number;
  total_amount?: number;
  items_count?: number;
  awb_number?: string | null;
  courier_name?: string | null;
  tracking_url?: string | null;
  shipped_at?: string;
  picked_up_at?: string;
  in_transit_at?: string;
  out_for_delivery_at?: string;
  delivered_at?: string;
  created_at?: string;
};

type ShipForm = {
  delivery_name: string;
  delivery_phone: string;
  delivery_address: string;
  delivery_city: string;
  delivery_state: string;
  delivery_pincode: string;
  weight: string;
};

const EMPTY_FORM: ShipForm = {
  delivery_name: '',
  delivery_phone: '',
  delivery_address: '',
  delivery_city: '',
  delivery_state: '',
  delivery_pincode: '',
  weight: '',
};

const STATUS_COLOR: Record<string, string> = {
  payment_confirmed: 'bg-ev-primary/10 text-ev-primary border-ev-primary/20',
  order_received: 'bg-ev-primary/10 text-ev-primary border-ev-primary/20',
  confirmed: 'bg-ev-primary/10 text-ev-primary border-ev-primary/20',
  pending: 'bg-ev-warning/10 text-ev-warning border-ev-warning/20',
  shipment_created: 'bg-ev-primary/10 text-ev-primary border-ev-primary/20',
  picked_up: 'bg-ev-primary/10 text-ev-primary border-ev-primary/20',
  in_transit: 'bg-ev-accent/10 text-ev-accent border-ev-accent/20',
  out_for_delivery: 'bg-ev-accent/10 text-ev-accent border-ev-accent/20',
  delivered: 'bg-ev-success/10 text-ev-success border-ev-success/20',
  order_cancelled: 'bg-ev-error/10 text-ev-error border-ev-error/20',
  payment_failed: 'bg-ev-error/10 text-ev-error border-ev-error/20',
};

const STATUS_LABEL: Record<string, string> = {
  payment_confirmed: 'Payment confirmed',
  order_received: 'Order received',
  shipment_created: 'Shipped',
  picked_up: 'Picked up',
  in_transit: 'In transit',
  out_for_delivery: 'Out for delivery',
  delivered: 'Delivered',
  order_cancelled: 'Cancelled',
  payment_failed: 'Payment failed',
};

const SHIPPABLE = ADMIN_SHIPPABLE_STATUSES;

const DELIVERY_STEPS = [
  { key: 'shipment_created', label: 'Shipped', timestamp: 'shipped_at' },
  { key: 'picked_up', label: 'Picked up', timestamp: 'picked_up_at' },
  { key: 'in_transit', label: 'In transit', timestamp: 'in_transit_at' },
  { key: 'out_for_delivery', label: 'Out for delivery', timestamp: 'out_for_delivery_at' },
  { key: 'delivered', label: 'Delivered', timestamp: 'delivered_at' },
];

function fmt(iso?: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function DeliveryTimeline({ order }: { order: Order }) {
  const statusOrder = DELIVERY_STEPS.map((s) => s.key);
  const currentIdx = statusOrder.indexOf(String(order.status || ''));
  if (currentIdx === -1) return null;

  return (
    <div className="mt-3 space-y-1.5">
      {DELIVERY_STEPS.map((step, idx) => {
        const done = idx <= currentIdx;
        const ts = fmt(order[step.timestamp as keyof Order] as string | undefined);
        return (
          <div key={step.key} className="flex items-center gap-2 text-xs">
            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${done ? 'bg-ev-primary' : 'bg-ev-border'}`} />
            <span className={done ? 'text-ev-text' : 'text-ev-muted'}>{step.label}</span>
            {ts && <span className="text-ev-subtle ml-auto">{ts}</span>}
          </div>
        );
      })}
    </div>
  );
}

export default function AdminOrdersPage() {
  const [rows, setRows] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [shipTarget, setShipTarget] = useState<Order | null>(null);
  const [form, setForm] = useState<ShipForm>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const firstField = useRef<HTMLInputElement>(null);

  const load = useCallback(() => {
    setLoading(true);
    adminApi
      .getOrders()
      .then((r) => setRows(Array.isArray(r.data) ? (r.data as Order[]) : []))
      .catch(() => toast.error('Failed to load orders'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      load();
    }, 0);
    return () => clearTimeout(timer);
  }, [load]);

  function openModal(order: Order) {
    setShipTarget(order);
    setForm(EMPTY_FORM);
    setTimeout(() => firstField.current?.focus(), 80);
  }

  function closeModal() {
    if (submitting) return;
    setShipTarget(null);
  }

  async function submitShip(e: React.FormEvent) {
    e.preventDefault();
    if (!shipTarget) return;
    setSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        delivery_name: form.delivery_name,
        delivery_phone: form.delivery_phone,
        delivery_address: form.delivery_address,
        delivery_city: form.delivery_city,
        delivery_state: form.delivery_state,
        delivery_pincode: form.delivery_pincode,
      };
      if (form.weight) body.weight = parseFloat(form.weight);
      await adminApi.shipOrder(shipTarget.id, body);
      toast.success('Shipment created — AWB assigned');
      setShipTarget(null);
      load();
    } catch {
      toast.error('Could not create shipment. Check Shiprocket credentials and try again.');
    } finally {
      setSubmitting(false);
    }
  }

  function field(label: string, key: keyof ShipForm, placeholder: string, opts?: { required?: boolean; type?: string }) {
    return (
      <div>
        <label className="block text-ev-muted text-xs mb-1">{label}{opts?.required !== false ? ' *' : ''}</label>
        <input
          ref={key === 'delivery_name' ? firstField : undefined}
          type={opts?.type ?? 'text'}
          value={form[key]}
          onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
          placeholder={placeholder}
          required={opts?.required !== false}
          className="w-full bg-ev-surface2 border border-ev-border rounded-lg px-3 py-2 text-ev-text text-sm focus:outline-none focus:border-ev-primary"
        />
      </div>
    );
  }

  return (
    <AdminShell>
      <main className="p-6 sm:p-10">
        <h1 className="text-2xl font-bold text-ev-text mb-1">Orders</h1>
        <p className="text-ev-muted text-sm mb-8">Orders placed with your shop. Ship directly via Shiprocket.</p>

        {loading ? (
          <div className="flex items-center gap-2 text-ev-muted py-16">
            <Loader2 className="animate-spin text-ev-primary" size={22} /> Loading…
          </div>
        ) : rows.length === 0 ? (
          <div className="ev-card p-12 text-center text-ev-muted">
            <ShoppingCart className="mx-auto mb-3 opacity-30" size={40} />
            <p className="text-ev-text font-medium mb-1">No orders yet</p>
            <p className="text-sm">When customers check out from your catalogue, orders will appear here.</p>
          </div>
        ) : (
          <div className="ev-card overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-ev-border text-left">
                  {['Order ID', 'Status', 'Total (₹)', 'Shipment & tracking', 'Placed', 'Action'].map((h) => (
                    <th key={h} className="px-4 py-3 text-ev-muted text-xs font-medium uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-ev-border">
                {rows.map((row) => (
                  <tr key={row.id} className="hover:bg-ev-surface2/80 transition-colors">
                    {/* Order ID */}
                    <td className="px-4 py-3 font-mono text-xs text-ev-muted max-w-[160px]">
                      <Link href={`/admin/orders/${row.id}`} className="hover:text-ev-primary hover:underline truncate block">
                        {row.id.slice(0, 8)}…
                      </Link>
                    </td>

                    {/* Status badge */}
                    <td className="px-4 py-3">
                      <span className={`ev-badge border text-[11px] font-semibold uppercase tracking-wide ${STATUS_COLOR[row.status ?? ''] ?? 'bg-ev-subtle/20 text-ev-muted border-ev-border'}`}>
                        {STATUS_LABEL[row.status ?? ''] ?? row.status ?? '—'}
                      </span>
                    </td>

                    {/* Total */}
                    <td className="px-4 py-3 text-ev-text font-semibold whitespace-nowrap">
                      {row.total_amount != null ? `₹${Number(row.total_amount).toLocaleString('en-IN')}` : '—'}
                    </td>

                    {/* Shipment + delivery timeline */}
                    <td className="px-4 py-3 min-w-[200px]">
                      {row.awb_number ? (
                        <div>
                          <div className="flex items-center gap-1.5 text-xs">
                            <Package size={12} className="text-ev-primary flex-shrink-0" />
                            <span className="text-ev-text font-mono font-semibold">{row.awb_number}</span>
                          </div>
                          <p className="text-ev-muted text-xs mt-0.5">{row.courier_name || 'Shiprocket'}</p>
                          {row.tracking_url && (
                            <a href={row.tracking_url} target="_blank" rel="noreferrer"
                              className="text-ev-primary text-xs hover:underline mt-0.5 inline-block">
                              Track shipment →
                            </a>
                          )}
                          <DeliveryTimeline order={row} />
                        </div>
                      ) : (
                        <span className="text-ev-subtle text-xs">Not shipped</span>
                      )}
                    </td>

                    {/* Placed */}
                    <td className="px-4 py-3 text-ev-muted whitespace-nowrap text-xs">{fmt(row.created_at) ?? '—'}</td>

                    {/* Action */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      {SHIPPABLE.has(String(row.status || '')) ? (
                        <button
                          type="button"
                          onClick={() => openModal(row)}
                          className="ev-btn-secondary py-1.5 px-3 text-xs inline-flex items-center gap-1.5"
                        >
                          <Truck size={13} /> Generate shipment
                        </button>
                      ) : (
                        <span className="text-ev-subtle text-xs">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {/* ── Ship modal ────────────────────────────────────────────────────── */}
      {shipTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="ev-card w-full max-w-lg overflow-hidden">
            {/* Modal header */}
            <div className="flex items-center justify-between p-5 border-b border-ev-border">
              <div>
                <h2 className="text-ev-text font-bold text-base">Generate shipment</h2>
                <p className="text-ev-muted text-xs mt-0.5">Order {shipTarget.id.slice(0, 8)}… · via Shiprocket</p>
              </div>
              <button type="button" onClick={closeModal} className="text-ev-muted hover:text-ev-text p-1 rounded-lg hover:bg-ev-surface2">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={(e) => void submitShip(e)} className="p-5 space-y-4">
              <p className="text-ev-muted text-xs">Enter the customer&apos;s delivery address to book this shipment on Shiprocket. The AWB number and courier will be saved automatically.</p>

              {/* 2-col row */}
              <div className="grid grid-cols-2 gap-3">
                {field('Recipient name', 'delivery_name', 'Full name')}
                {field('Phone', 'delivery_phone', '10-digit mobile')}
              </div>

              {field('Street address', 'delivery_address', 'Door / building / street')}

              <div className="grid grid-cols-3 gap-3">
                {field('City', 'delivery_city', 'City')}
                {field('State', 'delivery_state', 'State')}
                {field('Pincode', 'delivery_pincode', '6-digit PIN')}
              </div>

              {field('Weight (kg)', 'weight', '0.5', { required: false, type: 'number' })}

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={submitting}
                  className="flex-1 ev-btn-secondary py-2.5 text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 ev-btn-primary py-2.5 text-sm flex items-center justify-center gap-2"
                >
                  {submitting ? <Loader2 size={15} className="animate-spin" /> : <Truck size={15} />}
                  {submitting ? 'Creating shipment…' : 'Create shipment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminShell>
  );
}
