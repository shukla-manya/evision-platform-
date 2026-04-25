'use client';

import { useEffect, useState } from 'react';
import { FileText, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { adminApi } from '@/lib/api';
import { AdminShell } from '@/components/admin/AdminShell';

type Invoice = {
  id: string;
  order_id?: string;
  amount?: number;
  status?: string;
  created_at?: string;
  issued_at?: string;
};

const statusColors: Record<string, string> = {
  pending: 'bg-ev-warning/10 text-ev-warning border-ev-warning/20',
  paid:    'bg-ev-success/10 text-ev-success border-ev-success/20',
  void:    'bg-ev-subtle/20 text-ev-muted border-ev-border',
};

function fmt(iso?: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function AdminInvoicesPage() {
  const [rows, setRows] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi
      .getInvoices()
      .then((r) => setRows(Array.isArray(r.data) ? (r.data as Invoice[]) : []))
      .catch(() => toast.error('Failed to load invoices'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <AdminShell>
      <main className="p-6 sm:p-10">
        <h1 className="text-2xl font-bold text-ev-text mb-1">Invoices</h1>
        <p className="text-ev-muted text-sm mb-8">Invoices linked to orders from your shop</p>

        {loading ? (
          <div className="flex items-center gap-2 text-ev-muted py-16">
            <Loader2 className="animate-spin text-ev-primary" size={22} />
            Loading…
          </div>
        ) : rows.length === 0 ? (
          <div className="ev-card p-12 text-center text-ev-muted">
            <FileText className="mx-auto mb-3 opacity-30" size={40} />
            <p className="text-ev-text font-medium mb-1">No invoices yet</p>
            <p className="text-sm">Invoices generated for your shop orders will show here.</p>
          </div>
        ) : (
          <div className="ev-card overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-ev-border text-left">
                  <th className="px-4 py-3 text-ev-muted text-xs font-medium uppercase tracking-wide">Invoice ID</th>
                  <th className="px-4 py-3 text-ev-muted text-xs font-medium uppercase tracking-wide">Order ID</th>
                  <th className="px-4 py-3 text-ev-muted text-xs font-medium uppercase tracking-wide">Status</th>
                  <th className="px-4 py-3 text-ev-muted text-xs font-medium uppercase tracking-wide whitespace-nowrap">Amount (₹)</th>
                  <th className="px-4 py-3 text-ev-muted text-xs font-medium uppercase tracking-wide whitespace-nowrap">Issued</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ev-border">
                {rows.map((row) => (
                  <tr key={row.id} className="hover:bg-ev-surface2/80 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-ev-muted max-w-[180px] truncate">
                      {row.id}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-ev-muted max-w-[180px] truncate">
                      {row.order_id ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`ev-badge border text-[11px] font-semibold uppercase tracking-wide ${statusColors[row.status ?? ''] ?? 'bg-ev-subtle/20 text-ev-muted border-ev-border'}`}>
                        {row.status ?? '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-ev-text font-semibold">
                      {row.amount != null ? `₹${Number(row.amount).toLocaleString('en-IN')}` : '—'}
                    </td>
                    <td className="px-4 py-3 text-ev-muted whitespace-nowrap text-xs">
                      {fmt(row.issued_at ?? row.created_at)}
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
