'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Heart, Loader2, Package } from 'lucide-react';
import toast from 'react-hot-toast';
import { catalogApi } from '@/lib/api';
import { PublicShell } from '@/components/public/PublicShell';
import { getWishlistIds, setWishlistIds } from '@/lib/wishlist';

type Product = {
  id: string;
  name: string;
  price_customer?: number;
  images?: string[];
  shop_name?: string | null;
};

function formatInr(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
}

export default function WishlistPage() {
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const ids = getWishlistIds();
    if (ids.length === 0) {
      setItems([]);
      setLoading(false);
      return;
    }
    try {
      const results = await Promise.all(
        ids.map(async (id) => {
          try {
            const { data } = await catalogApi.getProduct(id);
            return data as Product;
          } catch {
            return null;
          }
        }),
      );
      setItems(results.filter(Boolean) as Product[]);
    } catch {
      toast.error('Could not load wishlist');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const on = () => void load();
    window.addEventListener('ev-wishlist', on);
    return () => window.removeEventListener('ev-wishlist', on);
  }, [load]);

  function remove(id: string) {
    setWishlistIds(getWishlistIds().filter((x) => x !== id));
    void load();
  }

  return (
    <PublicShell>
      <main className="ev-container py-10">
        <h1 className="text-2xl font-bold text-ev-text flex items-center gap-2 mb-2">
          <Heart className="text-ev-primary" size={26} />
          Wishlist
        </h1>
        <p className="text-ev-muted text-sm mb-8">Saved on this device. Sign in to sync across devices when available.</p>
        {loading ? (
          <div className="flex justify-center py-20 text-ev-muted gap-2">
            <Loader2 className="animate-spin text-ev-primary" size={24} /> Loading…
          </div>
        ) : items.length === 0 ? (
          <div className="ev-card p-12 text-center text-ev-muted">
            <Package className="mx-auto mb-3 opacity-30" size={40} />
            <p className="text-ev-text font-medium mb-1">No saved products</p>
            <Link href="/shop" className="ev-btn-primary text-sm py-2.5 px-5 mt-4 inline-flex">
              Browse shop
            </Link>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {items.map((p) => {
              const img = p.images?.[0];
              const price = Number(p.price_customer || 0);
              return (
                <article key={p.id} className="ev-card overflow-hidden flex flex-col">
                  <Link href={`/products/${p.id}`} className="aspect-[4/3] bg-ev-surface2 relative block">
                    {img ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={img} alt="" className="absolute inset-0 w-full h-full object-cover" />
                    ) : null}
                  </Link>
                  <div className="p-4 flex-1 flex flex-col">
                    <p className="text-ev-subtle text-xs truncate">{p.shop_name || 'Partner shop'}</p>
                    <Link href={`/products/${p.id}`} className="font-semibold text-ev-text hover:text-ev-primary line-clamp-2">
                      {p.name}
                    </Link>
                    <p className="text-lg font-bold text-ev-text mt-2">{price > 0 ? formatInr(price) : '—'}</p>
                    <button
                      type="button"
                      onClick={() => remove(p.id)}
                      className="mt-auto text-sm text-ev-error font-semibold pt-3 px-2 py-1.5 rounded-lg border border-ev-error/25 hover:bg-ev-error/5 self-start"
                    >
                      Remove
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>
    </PublicShell>
  );
}
