'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Clock, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { catalogApi } from '@/lib/api';
import { PublicShell } from '@/components/public/PublicShell';

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

function endOfTodayMs() {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d.getTime();
}

export default function DealsPage() {
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    catalogApi
      .getProducts({})
      .then((r) => setProducts(Array.isArray(r.data) ? (r.data as Product[]).slice(0, 12) : []))
      .catch(() => toast.error('Could not load deals'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const end = endOfTodayMs();
  const sec = Math.max(0, Math.floor((end - now) / 1000));
  const hh = String(Math.floor(sec / 3600)).padStart(2, '0');
  const mm = String(Math.floor((sec % 3600) / 60)).padStart(2, '0');
  const ss = String(sec % 60).padStart(2, '0');

  return (
    <PublicShell>
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-10">
          <div>
            <h1 className="text-3xl font-bold text-ev-text mb-2">Today&apos;s deals</h1>
            <p className="text-ev-muted max-w-xl">
              Limited-time catalogue highlights from partner stores. Prices shown are live customer prices — offer window resets at midnight.
            </p>
          </div>
          <div className="ev-card px-6 py-4 border-ev-warning/25 bg-ev-warning/5 shrink-0">
            <p className="text-xs uppercase tracking-wide text-ev-muted mb-1 flex items-center gap-1">
              <Clock size={12} /> Ends in
            </p>
            <p className="text-3xl font-mono font-bold text-ev-text tracking-tight">
              {hh}:{mm}:{ss}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-24 text-ev-muted gap-2">
            <Loader2 className="animate-spin text-ev-primary" size={26} /> Loading deals…
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((p) => {
              const price = Number(p.price_customer || 0);
              const strike = price > 0 ? Math.round(price * 1.12) : null;
              return (
                <Link key={p.id} href={`/products/${p.id}`} className="ev-card overflow-hidden group hover:border-ev-primary/35 transition-colors">
                  <div className="aspect-[4/3] bg-ev-surface2 border-b border-ev-border relative">
                    {p.images?.[0] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.images[0]} alt="" className="absolute inset-0 w-full h-full object-cover" />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-ev-subtle text-sm">No image</div>
                    )}
                    <span className="absolute top-3 left-3 text-xs font-bold bg-ev-error text-white px-2 py-1 rounded-lg">
                      Deal
                    </span>
                  </div>
                  <div className="p-5">
                    <p className="text-ev-subtle text-xs mb-1 truncate">{p.shop_name || 'Partner shop'}</p>
                    <p className="font-semibold text-ev-text line-clamp-2 group-hover:text-ev-primary">{p.name}</p>
                    <div className="mt-3 flex items-baseline gap-2">
                      <span className="text-xl font-bold text-ev-primary">{price > 0 ? formatInr(price) : '—'}</span>
                      {strike ? <span className="text-sm text-ev-muted line-through">{formatInr(strike)}</span> : null}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        <div className="mt-12 text-center">
          <Link href="/shop" className="ev-btn-secondary inline-flex">
            Browse full catalogue
          </Link>
        </div>
      </main>
    </PublicShell>
  );
}
