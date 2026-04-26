'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Download, FileText, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { ordersApi } from '@/lib/api';
import { getApiErrorMessage } from '@/lib/api-errors';
import { getRole } from '@/lib/auth';

function formatInr(n: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Number(n || 0));
}

type SubOrder = {
  id: string;
  status?: string;
  total_amount?: number;
  gst_invoice_url?: string | null;
};

type OrderGroup = {
  id: string;
  status?: string;
  total_amount?: number;
  created_at?: string;
  sub_orders?: SubOrder[];
};

function orderLabel(id: string) {
  return `#D${id.replace(/\D/g, '').slice(-4).padStart(4, '0')}`;
}

export default function DealerInvoicesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<OrderGroup[]>([]);
  const [zipping, setZipping] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await ordersApi.myOrders();
      setOrders(Array.isArray(res.data) ? (res.data as OrderGroup[]) : []);
    } catch {
      toast.error('Failed to load orders');
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
    void load();
  }, [router, load]);

  const rows = useMemo(() => {
    const successful = orders.filter((o) => String(o.status || '').toLowerCase() !== 'payment_failed');
    const out: { groupId: string; subId: string; label: string; date: string; amount: number; url: string }[] = [];
    for (const g of successful) {
      const subs = g.sub_orders || [];
      for (const s of subs) {
        const u = s.gst_invoice_url;
        if (typeof u === 'string' && (u.startsWith('http://') || u.startsWith('https://'))) {
          out.push({
            groupId: g.id,
            subId: s.id,
            label: orderLabel(g.id),
            date: g.created_at ? new Date(g.created_at).toLocaleDateString('en-IN') : '—',
            amount: Number(s.total_amount ?? g.total_amount ?? 0),
            url: u,
          });
        }
      }
    }
    return out.sort((a, b) => (a.date < b.date ? 1 : -1));
  }, [orders]);

  async function downloadZip() {
    if (!rows.length) {
      toast.error('No GST tax invoices available yet');
      return;
    }
    setZipping(true);
    try {
      const res = await ordersApi.downloadGstInvoicesZip();
      const blob = new Blob([res.data as BlobPart], { type: 'application/zip' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'gst-tax-invoices.zip';
      a.rel = 'noopener';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success('GST invoices ZIP downloaded');
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Could not download ZIP'));
    } finally {
      setZipping(false);
    }
  }

  return (
    <div className="min-h-screen bg-ev-bg ev-shell-body">
      <div className="max-w-3xl mx-auto w-full min-w-0 space-y-6">
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/dealer/dashboard"
            className="text-ev-muted text-sm inline-flex items-center gap-1 hover:text-ev-text"
          >
            <ArrowLeft size={14} /> Dashboard
          </Link>
        </div>

        <div className="ev-card p-6 sm:p-8">
          <h1 className="text-2xl font-bold text-ev-text flex items-center gap-2">
            <FileText size={24} className="text-ev-primary" />
            GST tax invoices
          </h1>
          <p className="text-ev-muted text-sm mt-2 leading-relaxed">
            Each document is a <strong className="text-ev-text font-semibold">GST Tax Invoice</strong> (not a simple
            receipt). It includes your dealer GSTIN, the seller&apos;s GSTIN, HSN codes per line item, and a breakdown
            of IGST / CGST / SGST where applicable, plus total taxable value, total tax, and grand total.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => void downloadZip()}
              disabled={zipping || !rows.length}
              className="ev-btn-primary text-sm py-2.5 px-4 inline-flex items-center gap-2 disabled:opacity-50"
            >
              {zipping ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
              Download all GST invoices (ZIP)
            </button>
            <Link href="/orders" className="ev-btn-secondary text-sm py-2.5 px-4 inline-flex items-center">
              My orders
            </Link>
          </div>
        </div>

        <div className="ev-card overflow-hidden">
          <div className="px-5 py-4 border-b border-ev-border">
            <h2 className="text-ev-text font-semibold">Available invoices</h2>
            <p className="text-ev-subtle text-xs mt-1">PDF opens in a new tab. ZIP bundles every GST invoice on file.</p>
          </div>
          {loading ? (
            <div className="flex items-center gap-2 text-ev-muted px-5 py-12">
              <Loader2 className="animate-spin text-ev-primary" size={20} />
              Loading…
            </div>
          ) : rows.length === 0 ? (
            <p className="px-5 py-12 text-center text-ev-muted text-sm">No GST tax invoices yet. They appear after eligible orders are invoiced.</p>
          ) : (
            <ul className="divide-y divide-ev-border">
              {rows.map((r) => (
                <li key={`${r.groupId}-${r.subId}`} className="px-5 py-4 flex flex-wrap items-center justify-between gap-3 hover:bg-ev-surface2/40">
                  <div>
                    <p className="text-ev-text font-mono text-sm">{r.label}</p>
                    <p className="text-ev-muted text-xs mt-0.5">
                      {r.date}
                      {r.amount > 0 ? <span className="mx-1">·</span> : null}
                      {r.amount > 0 ? <span className="tabular-nums">{formatInr(r.amount)}</span> : null}
                    </p>
                  </div>
                  <a
                    href={r.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-ev-primary text-sm font-medium inline-flex items-center gap-1 hover:underline"
                  >
                    <Download size={14} />
                    GST PDF
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
