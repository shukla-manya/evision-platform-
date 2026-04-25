'use client';

import { useEffect, useState } from 'react';
import { ShoppingCart, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { adminApi } from '@/lib/api';
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
  created_at?: string;
};

const statusColors: Record<string, string> = {
  pending: 'bg-ev-warning/10 text-ev-warning border-ev-warning/20',
  confirmed: 'bg-ev-primary/10 text-ev-primary border-ev-primary/20',
  payment_confirmed: 'bg-ev-primary/10 text-ev-primary border-ev-primary/20',
  order_received: 'bg-ev-primary/10 text-ev-primary border-ev-primary/20',
  shipped: 'bg-ev-accent/10 text-ev-accent border-ev-accent/20',
  shipment_created: 'bg-ev-accent/10 text-ev-accent border-ev-accent/20',
  picked_up: 'bg-ev-accent/10 text-ev-accent border-ev-accent/20',
  in_transit: 'bg-ev-primary/10 text-ev-primary border-ev-primary/20',
  out_for_delivery: 'bg-ev-primary/10 text-ev-primary border-ev-primary/20',
  delivered: 'bg-ev-success/10 text-ev-success border-ev-success/20',
  cancelled: 'bg-ev-error/10 text-ev-error border-ev-error/20',
  order_cancelled: 'bg-ev-error/10 text-ev-error border-ev-error/20',
};

function fmt(iso?: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

const shippableStatuses = new Set(['order_received', 'payment_confirmed', 'confirmed', 'pending']);

export default function AdminOrdersPage() {
  const [rows, setRows] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [shippingId, setShippingId] = useState<string | null>(null);

  function load() {
    setLoading(true);
    adminApi
      .getOrders()
      .then((r) => setRows(Array.isArray(r.data) ? (r.data as Order[]) : []))
      .catch(() => toast.error('Failed to load orders'))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <AdminShell>
      <main className="p-6 sm:p-10">
        <h1 className="text-2xl font-bold text-ev-text mb-1">Orders</h1>
        <p className="text-ev-muted text-sm mb-8">Orders placed with your shop only</p>

        {loading ? (
          <div className="flex items-center gap-2 text-ev-muted py-16">
            <Loader2 className="animate-spin text-ev-primary" size={22} />
            Loading…
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
                  <th className="px-4 py-3 text-ev-muted text-xs font-medium uppercase tracking-wide">Order ID</th>
                  <th className="px-4 py-3 text-ev-muted text-xs font-medium uppercase tracking-wide">Status</th>
                  <th className="px-4 py-3 text-ev-muted text-xs font-medium uppercase tracking-wide whitespace-nowrap">Total (₹)</th>
                  <th className="px-4 py-3 text-ev-muted text-xs font-medium uppercase tracking-wide whitespace-nowrap">Items</th>
                  <th className="px-4 py-3 text-ev-muted text-xs font-medium uppercase tracking-wide whitespace-nowrap">Shipment</th>
                  <th className="px-4 py-3 text-ev-muted text-xs font-medium uppercase tracking-wide whitespace-nowrap">Placed</th>
                  <th className="px-4 py-3 text-ev-muted text-xs font-medium uppercase tracking-wide whitespace-nowrap">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ev-border">
                {rows.map((row) => (
                  <tr key={row.id} className="hover:bg-ev-surface2/80 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-ev-muted max-w-[180px] truncate">
                      {row.id}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`ev-badge border text-[11px] font-semibold uppercase tracking-wide ${statusColors[row.status ?? ''] ?? 'bg-ev-subtle/20 text-ev-muted border-ev-border'}`}>
                        {row.status ?? '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-ev-text font-semibold">
                      {row.total_amount != null
                        ? `₹${Number(row.total_amount).toLocaleString('en-IN')}`
                        : row.total != null
                          ? `₹${Number(row.total).toLocaleString('en-IN')}`
                          : '—'}
                    </td>
                    <td className="px-4 py-3 text-ev-muted">
                      {row.items_count ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-ev-muted whitespace-nowrap text-xs">
                      {row.awb_number ? (
                        <div className="space-y-0.5">
                          <p className="text-ev-text font-mono">{row.awb_number}</p>
                          <p>{row.courier_name || 'Shiprocket'}</p>
                          {row.tracking_url ? (
                            <a
                              href={row.tracking_url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-ev-primary hover:underline"
                            >
                              Track
                            </a>
                          ) : null}
                        </div>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-4 py-3 text-ev-muted whitespace-nowrap text-xs">
                      {fmt(row.created_at)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {shippableStatuses.has(String(row.status || '').toLowerCase()) ? (
                        <button
                          type="button"
                          disabled={shippingId === row.id}
                          onClick={async () => {
                            setShippingId(row.id);
                            try {
                              await adminApi.shipOrder(row.id);
                              toast.success('Shipment created');
                              load();
                            } catch {
                              toast.error('Could not create shipment');
                            } finally {
                              setShippingId(null);
                            }
                          }}
                          className="ev-btn-secondary py-1.5 px-3 text-xs"
                        >
                          {shippingId === row.id ? 'Shipping…' : 'Ship'}
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
    </AdminShell>
  );
}
