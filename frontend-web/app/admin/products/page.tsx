'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Zap, Package, Loader2, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import { adminApi } from '@/lib/api';
import { clearAuth, getRole } from '@/lib/auth';

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
  const router = useRouter();
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (getRole() !== 'admin') {
      router.push('/login');
      return;
    }
    adminApi
      .getProducts()
      .then((r) => setItems(r.data || []))
      .catch(() => toast.error('Failed to load products'))
      .finally(() => setLoading(false));
  }, [router]);

  return (
    <div className="min-h-screen bg-ev-bg flex">
      <aside className="w-56 sm:w-64 bg-ev-surface border-r border-ev-border flex flex-col fixed h-full">
        <div className="p-5 border-b border-ev-border flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center">
            <Zap size={16} className="text-white" />
          </div>
          <span className="text-ev-text font-bold text-sm">Admin</span>
        </div>
        <nav className="p-3 space-y-1 flex-1">
          <Link href="/admin/dashboard" className="block px-3 py-2 rounded-xl text-sm text-ev-muted hover:bg-ev-surface2">
            Dashboard
          </Link>
          <Link href="/admin/products" className="block px-3 py-2 rounded-xl text-sm bg-ev-primary/10 text-ev-primary border border-ev-primary/20">
            Products
          </Link>
        </nav>
        <div className="p-3 border-t border-ev-border">
          <button
            type="button"
            onClick={() => {
              clearAuth();
              router.push('/login');
            }}
            className="text-ev-muted text-sm hover:text-ev-error"
          >
            Sign out
          </button>
        </div>
      </aside>

      <main className="ml-56 sm:ml-64 flex-1 p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <Link href="/admin/dashboard" className="text-ev-muted text-sm inline-flex items-center gap-1 hover:text-ev-text mb-2">
              <ArrowLeft size={14} /> Dashboard
            </Link>
            <h1 className="text-2xl font-bold text-ev-text">Your products</h1>
            <p className="text-ev-muted text-sm mt-0.5">Customer and dealer prices, stock, and images</p>
          </div>
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
            <p className="text-sm mb-4">Use the API or a future form to add products with images.</p>
            <code className="text-xs bg-ev-surface2 px-2 py-1 rounded border border-ev-border">POST /admin/products</code>
          </div>
        ) : (
          <div className="grid gap-4">
            {items.map((p) => (
              <div key={p.id} className="ev-card p-4 flex gap-4 flex-col sm:flex-row">
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
                      <span className="text-ev-subtle block text-xs">Customer</span>
                      <span className="text-ev-text font-semibold">₹{Number(p.price_customer).toLocaleString('en-IN')}</span>
                    </div>
                    <div>
                      <span className="text-ev-subtle block text-xs">Dealer</span>
                      <span className="text-ev-text font-semibold">₹{Number(p.price_dealer).toLocaleString('en-IN')}</span>
                    </div>
                    <div>
                      <span className="text-ev-subtle block text-xs">Stock</span>
                      <span className="text-ev-text font-semibold">{p.stock}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
