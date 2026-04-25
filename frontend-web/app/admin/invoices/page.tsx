'use client';

import { useEffect, useState } from 'react';
import { FileText, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { adminApi } from '@/lib/api';
import { AdminShell } from '@/components/admin/AdminShell';

type InvoiceRow = Record<string, unknown>;

function formatCell(v: unknown): string {
  if (v == null) return '—';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

export default function AdminInvoicesPage() {
  const [rows, setRows] = useState<InvoiceRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi
      .getInvoices()
      .then((r) => setRows(Array.isArray(r.data) ? r.data : []))
      .catch(() => toast.error('Failed to load invoices'))
      .finally(() => setLoading(false));
  }, []);

  const keys =
    rows.length > 0
      ? Array.from(
          rows.reduce((acc, row) => {
            Object.keys(row).forEach((k) => acc.add(k));
            return acc;
          }, new Set<string>()),
        ).slice(0, 14)
      : ['id', 'order_id', 'amount', 'status', 'created_at'];

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
                <tr className="border-b border-ev-border">
                  {keys.map((k) => (
                    <th key={k} className="text-left px-4 py-3 text-ev-muted text-xs font-medium uppercase tracking-wide whitespace-nowrap">
                      {k.replace(/_/g, ' ')}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-ev-border">
                {rows.map((row, i) => (
                  <tr key={(row.id as string) || String(i)} className="hover:bg-ev-surface2/80">
                    {keys.map((k) => (
                      <td key={k} className="px-4 py-2.5 text-ev-text whitespace-nowrap max-w-[220px] truncate font-mono text-xs">
                        {formatCell(row[k])}
                      </td>
                    ))}
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
