'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Package, Loader2, Pencil } from 'lucide-react';
import toast from 'react-hot-toast';
import { adminApi } from '@/lib/api';
import { AdminShell } from '@/components/admin/AdminShell';

type Product = {
  id: string;
  name: string;
  price_customer: number;
  price_dealer: number;
  stock: number;
  active?: boolean;
  images?: string[];
  is_low_stock?: boolean;
};

export default function AdminProductsPage() {
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi
      .getProducts()
      .then((r) => setItems(r.data || []))
      .catch(() => toast.error('Failed to load products'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <AdminShell>
      <main className="p-6 sm:p-10">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-ev-text">Products</h1>
            <p className="text-ev-muted text-sm mt-0.5">Retail and dealer prices, stock, and images</p>
          </div>
          <Link
            href="/admin/products/new"
            className="ev-btn-primary inline-flex items-center justify-center gap-2 py-2.5 px-4 text-sm shrink-0"
          >
            <Plus size={18} />
            Add product
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
            <Link href="/admin/products/new" className="ev-btn-primary inline-flex items-center gap-2 py-2 px-4 text-sm">
              <Plus size={16} />
              Add product
            </Link>
          </div>
        ) : (
          <div className="grid gap-4">
            {items.map((p) => (
              <div key={p.id} className="ev-card p-4 flex gap-4 flex-col sm:flex-row sm:items-center">
                <div className="relative w-full sm:w-28 h-36 sm:h-28 shrink-0 rounded-xl overflow-hidden bg-ev-surface2 border border-ev-border">
                  {p.images?.[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.images[0]} alt="" className="absolute inset-0 w-full h-full object-cover" />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-ev-subtle text-xs">No image</div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h2 className="text-ev-text font-semibold truncate">{p.name}</h2>
                    {p.is_low_stock ? (
                      <span className="text-[11px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-ev-warning/15 text-ev-warning border border-ev-warning/25">
                        Low stock
                      </span>
                    ) : null}
                    {p.active === false ? (
                      <span className="text-[11px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-ev-subtle/30 text-ev-muted border border-ev-border">
                        Inactive
                      </span>
                    ) : null}
                  </div>
                  <p className="text-ev-muted text-xs font-mono truncate mb-2">{p.id}</p>
                  <div className="flex flex-wrap gap-4 text-sm">
                    <div>
                      <span className="text-ev-subtle block text-xs">Customer price</span>
                      <span className="text-ev-text font-semibold">₹{Number(p.price_customer).toLocaleString('en-IN')}</span>
                    </div>
                    <div>
                      <span className="text-ev-subtle block text-xs">Dealer price</span>
                      <span className="text-ev-text font-semibold">₹{Number(p.price_dealer).toLocaleString('en-IN')}</span>
                    </div>
                    <div>
                      <span className="text-ev-subtle block text-xs">Stock</span>
                      <span className="text-ev-text font-semibold">{p.stock}</span>
                    </div>
                  </div>
                </div>
                <Link
                  href={`/admin/products/${p.id}/edit`}
                  className="ev-btn-secondary inline-flex items-center justify-center gap-2 py-2.5 px-4 text-sm shrink-0 self-start sm:self-center"
                >
                  <Pencil size={16} />
                  Edit
                </Link>
              </div>
            ))}
          </div>
        )}
      </main>
    </AdminShell>
  );
}
