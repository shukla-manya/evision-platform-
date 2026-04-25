'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Boxes, Loader2, Package } from 'lucide-react';
import toast from 'react-hot-toast';
import { adminApi } from '@/lib/api';
import { AdminShell } from '@/components/admin/AdminShell';

type Product = {
  id: string;
  name: string;
  stock: number;
  low_stock_threshold?: number;
  is_low_stock?: boolean;
};

export default function AdminInventoryPage() {
  const [rows, setRows] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi
      .getProducts()
      .then((r) => setRows(Array.isArray(r.data) ? (r.data as Product[]) : []))
      .catch(() => toast.error('Failed to load inventory'))
      .finally(() => setLoading(false));
  }, []);

  const sorted = [...rows].sort((a, b) => a.stock - b.stock);

  return (
    <AdminShell>
      <main className="p-6 sm:p-10">
        <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-ev-text flex items-center gap-2">
              <Boxes size={26} className="text-ev-primary" />
              Inventory
            </h1>
            <p className="text-ev-muted text-sm mt-0.5">Stock levels and low-stock alerts across your catalogue</p>
          </div>
          <Link href="/admin/products/new" className="ev-btn-primary text-sm inline-flex items-center gap-2">
            <Package size={16} />
            Add product
          </Link>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-ev-muted py-16">
            <Loader2 className="animate-spin text-ev-primary" size={22} /> Loading…
          </div>
        ) : sorted.length === 0 ? (
          <div className="ev-card p-12 text-center text-ev-muted">No products yet.</div>
        ) : (
          <div className="ev-card overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-ev-border text-left">
                  {(['Product', 'Stock', 'Alert at', 'Status'] as const).map((h) => (
                    <th key={h} className="px-4 py-3 text-ev-muted text-xs font-medium uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-ev-border">
                {sorted.map((p) => {
                  const thr = p.low_stock_threshold ?? 10;
                  const critical = p.stock <= Math.max(1, Math.floor(thr / 2));
                  return (
                    <tr key={p.id} className="hover:bg-ev-surface2/80 transition-colors">
                      <td className="px-4 py-3 text-ev-text font-medium">{p.name}</td>
                      <td className="px-4 py-3 font-semibold tabular-nums">{p.stock}</td>
                      <td className="px-4 py-3 text-ev-muted tabular-nums">{thr}</td>
                      <td className="px-4 py-3 text-right">
                        {p.is_low_stock || p.stock <= thr ? (
                          <span
                            className={`text-[11px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full border ${
                              critical
                                ? 'bg-ev-error/10 text-ev-error border-ev-error/25'
                                : 'bg-ev-warning/10 text-ev-warning border-ev-warning/25'
                            }`}
                          >
                            {critical ? 'Critical' : 'Low'}
                          </span>
                        ) : (
                          <span className="text-ev-muted text-xs">OK</span>
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
    </AdminShell>
  );
}
