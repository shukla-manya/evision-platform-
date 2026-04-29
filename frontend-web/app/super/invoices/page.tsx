'use client';

import { useEffect, useState } from 'react';
import { FileText, Loader2, Download } from 'lucide-react';
import toast from 'react-hot-toast';
import { superadminApi } from '@/lib/api';
import { SuperadminShell } from '@/components/superadmin/SuperadminShell';

type Invoice = {
  id: string;
  order_id?: string;
  invoice_number?: string;
  amount?: number;
  total_amount?: number;
  status?: string;
  created_at?: string;
  issued_at?: string;
  buyer_name?: string;
  buyer_type?: string;
  download_pdf?: string | null;
  customer_invoice_url?: string;
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

export default function AdminInvoicesPage() {
  const [rows, setRows] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    superadminApi
      .getCatalogInvoices()
      .then((r) => setRows(Array.isArray(r.data) ? (r.data as Invoice[]) : []))
      .catch(() => toast.error('Failed to load invoices'))
      .finally(() => setLoading(false));
  }, []);

  function pdfHref(row: Invoice) {
    return row.download_pdf || row.customer_invoice_url || null;
  }

  return (
    <SuperadminShell>
      <main className="w-full min-w-0 max-w-6xl">
        <h1 className="text-2xl font-bold text-ev-text mb-1">Invoices</h1>
        <p className="text-ev-muted text-sm mb-8">PDFs generated for your shop orders</p>

        {loading ? (
          <div className="flex items-center gap-2 text-ev-muted py-16">
            <Loader2 className="animate-spin text-ev-primary" size={22} />
            Loading…
          </div>
        ) : rows.length === 0 ? (
          <div className="ev-card p-12 text-center text-ev-muted">
            <FileText className="mx-auto mb-3 opacity-30" size={40} />
            <p className="text-ev-text font-medium mb-1">No invoices yet</p>
            <p className="text-sm">Invoices appear after orders are fulfilled and PDFs are generated.</p>
          </div>
        ) : (
          <div className="ev-card overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-ev-border text-left bg-ev-surface2/80">
                  <th className="px-4 py-3 text-ev-muted text-xs font-semibold uppercase tracking-wide">Invoice #</th>
                  <th className="px-4 py-3 text-ev-muted text-xs font-semibold uppercase tracking-wide">Order</th>
                  <th className="px-4 py-3 text-ev-muted text-xs font-semibold uppercase tracking-wide">Buyer</th>
                  <th className="px-4 py-3 text-ev-muted text-xs font-semibold uppercase tracking-wide">Type</th>
                  <th className="px-4 py-3 text-ev-muted text-xs font-semibold uppercase tracking-wide text-right">Amount</th>
                  <th className="px-4 py-3 text-ev-muted text-xs font-semibold uppercase tracking-wide">Generated</th>
                  <th className="px-4 py-3 text-ev-muted text-xs font-semibold uppercase tracking-wide text-right">PDF</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ev-border">
                {rows.map((row) => {
                  const href = pdfHref(row);
                  const amt = row.amount ?? row.total_amount;
                  return (
                    <tr key={row.id} className="hover:bg-ev-surface2/80 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-ev-text font-semibold">
                        {row.invoice_number || row.id.slice(0, 8)}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-ev-muted max-w-[120px] truncate" title={row.order_id}>
                        {row.order_id ? `${String(row.order_id).slice(0, 8)}…` : '—'}
                      </td>
                      <td className="px-4 py-3 text-ev-text max-w-[160px] truncate">{row.buyer_name || '—'}</td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-medium text-ev-muted">{row.buyer_type || '—'}</span>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold tabular-nums">
                        {amt != null ? `₹${Number(amt).toLocaleString('en-IN')}` : '—'}
                      </td>
                      <td className="px-4 py-3 text-ev-muted whitespace-nowrap text-xs">{fmt(row.issued_at ?? row.created_at)}</td>
                      <td className="px-4 py-3 text-right">
                        {href ? (
                          <a
                            href={href}
                            target="_blank"
                            rel="noreferrer"
                            className="ev-btn-secondary text-xs py-1.5 px-3 inline-flex items-center gap-1.5"
                          >
                            <Download size={14} />
                            Download PDF
                          </a>
                        ) : (
                          <span className="text-ev-subtle text-xs">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </SuperadminShell>
  );
}
