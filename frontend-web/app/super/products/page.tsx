'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, Package, Loader2, Pencil, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { superadminApi } from '@/lib/api';
import { getApiErrorMessage } from '@/lib/api-errors';
import { SuperadminShell } from '@/components/superadmin/SuperadminShell';

type Product = {
  id: string;
  name: string;
  price_customer: number;
  price_dealer: number;
  stock: number;
  active?: boolean;
  images?: string[];
  is_low_stock?: boolean;
  category_name?: string;
};

export default function AdminProductsPage() {
  const router = useRouter();
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    superadminApi
      .getCatalogProducts()
      .then((r) => setItems((r.data as Product[]) || []))
      .catch(() => toast.error('Failed to load products'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function removeProduct(id: string, name: string) {
    if (!window.confirm(`Delete “${name}”? This cannot be undone.`)) return;
    setDeleting(id);
    try {
      await superadminApi.deleteCatalogProduct(id);
      toast.success('Product deleted');
      load();
    } catch (e: unknown) {
      toast.error(getApiErrorMessage(e, 'Delete failed'));
    } finally {
      setDeleting(null);
    }
  }

  return (
    <SuperadminShell>
      <main className="w-full min-w-0 max-w-6xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-ev-text">My products</h1>
            <p className="text-ev-muted text-sm mt-0.5">Customer and dealer prices, stock, and visibility</p>
          </div>
          <Link
            href="/super/products/new"
            className="ev-btn-primary inline-flex items-center justify-center gap-2 py-2.5 px-4 text-sm shrink-0"
          >
            <Plus size={18} />
            Add new product
          </Link>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20 text-ev-muted gap-2">
            <Loader2 className="animate-spin text-ev-primary" size={22} />
            Loading…
          </div>
        ) : items.length === 0 ? (
          <div className="ev-card p-12 text-center text-ev-muted">
            <Package className="mx-auto mb-3 opacity-30" size={40} />
            <p className="text-ev-text font-medium mb-1">No products yet</p>
            <p className="text-sm mb-4">Create your first product with customer and dealer prices.</p>
            <Link href="/super/products/new" className="ev-btn-primary inline-flex items-center gap-2 py-2 px-4 text-sm">
              <Plus size={16} />
              Add new product
            </Link>
          </div>
        ) : (
          <div className="ev-card overflow-x-auto border-ev-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-ev-border bg-ev-surface2/80 text-left text-ev-muted">
                  <th className="px-4 py-3 font-semibold w-16"> </th>
                  <th className="px-4 py-3 font-semibold">Name</th>
                  <th className="px-4 py-3 font-semibold">Category</th>
                  <th className="px-4 py-3 font-semibold text-right">Customer (₹)</th>
                  <th className="px-4 py-3 font-semibold text-right">Dealer (₹)</th>
                  <th className="px-4 py-3 font-semibold text-right">Stock</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ev-border">
                {items.map((p) => (
                  <tr key={p.id} className="hover:bg-ev-surface2/40">
                    <td className="px-4 py-3">
                      <div className="w-12 h-12 rounded-lg overflow-hidden border border-ev-border bg-ev-surface2 shrink-0">
                        {p.images?.[0] ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={p.images[0]} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[10px] text-ev-subtle">—</div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-medium text-ev-text max-w-[200px]">
                      <span className="truncate block" title={p.name}>
                        {p.name}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-ev-muted">{p.category_name || '—'}</td>
                    <td className="px-4 py-3 text-right tabular-nums">₹{Number(p.price_customer).toLocaleString('en-IN')}</td>
                    <td className="px-4 py-3 text-right tabular-nums">₹{Number(p.price_dealer).toLocaleString('en-IN')}</td>
                    <td className="px-4 py-3 text-right tabular-nums font-medium">{p.stock}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-[11px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full border ${
                          p.active === false
                            ? 'bg-ev-subtle/20 text-ev-muted border-ev-border'
                            : 'bg-ev-success/10 text-ev-success border-ev-success/25'
                        }`}
                      >
                        {p.active === false ? 'Inactive' : 'Active'}
                      </span>
                      {p.is_low_stock ? (
                        <span className="ml-1 text-[10px] font-semibold text-ev-warning">Low</span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => router.push(`/super/products/${p.id}/edit`)}
                        className="ev-btn-secondary text-xs py-1.5 px-2.5 inline-flex items-center gap-1 mr-2"
                      >
                        <Pencil size={12} />
                        Edit
                      </button>
                      <button
                        type="button"
                        disabled={deleting === p.id}
                        onClick={() => void removeProduct(p.id, p.name)}
                        className="rounded-lg border border-red-600/40 text-red-600 text-xs font-semibold py-1.5 px-2.5 inline-flex items-center gap-1 hover:bg-red-600/5 disabled:opacity-40"
                      >
                        <Trash2 size={12} />
                        {deleting === p.id ? '…' : 'Delete'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </SuperadminShell>
  );
}
