'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Camera, Search, SlidersHorizontal, ShoppingBag, Loader2, ShoppingCart, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import { cartApi, catalogApi } from '@/lib/api';
import { getRole } from '@/lib/auth';

type Product = {
  id: string;
  name: string;
  description?: string;
  price_customer?: number;
  price_dealer?: number;
  images?: string[];
  stock?: number;
  shop_name?: string | null;
  brand?: string | null;
  category_id?: string;
};

type Category = { id: string; name: string; parent_id?: string | null };

function formatInr(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
}

function displayPrice(p: Product, role?: string | null) {
  if (role === 'dealer') {
    const v = p.price_dealer;
    if (v == null || Number.isNaN(Number(v))) return '—';
    return formatInr(Number(v));
  }
  if (role === 'admin' || role === 'superadmin') {
    const c = p.price_customer;
    const d = p.price_dealer;
    if (
      c != null &&
      d != null &&
      !Number.isNaN(Number(c)) &&
      !Number.isNaN(Number(d))
    ) {
      return `${formatInr(Number(c))} retail · ${formatInr(Number(d))} dealer`;
    }
    const v = c ?? d;
    if (v == null || Number.isNaN(Number(v))) return '—';
    return formatInr(Number(v));
  }
  const v = p.price_customer;
  if (v == null || Number.isNaN(Number(v))) return '—';
  return formatInr(Number(v));
}

export default function ShopPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [brand, setBrand] = useState('');
  const role = typeof window !== 'undefined' ? getRole() : undefined;
  const canAddToCart = role === 'customer' || role === 'dealer';

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [catRes, prodRes] = await Promise.all([
        catalogApi.getCategories(),
        catalogApi.getProducts({
          search: search.trim() || undefined,
          category_id: categoryId || undefined,
          brand: brand.trim() || undefined,
        }),
      ]);
      setCategories(catRes.data || []);
      setProducts(prodRes.data || []);
    } catch {
      toast.error('Could not load catalogue');
    } finally {
      setLoading(false);
    }
  }, [search, categoryId, brand]);

  useEffect(() => {
    const t = setTimeout(() => load(), 300);
    return () => clearTimeout(t);
  }, [load]);

  const priceHint = useMemo(() => {
    if (role === 'dealer') return 'Dealer pricing';
    if (role === 'admin' || role === 'superadmin') return 'Retail & dealer pricing';
    return 'Retail pricing';
  }, [role]);

  return (
    <div className="min-h-screen bg-ev-bg">
      <header className="ev-header">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 bg-gradient-primary rounded-lg flex items-center justify-center shadow-ev-glow shrink-0">
              <Camera size={18} className="text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-white font-bold text-sm truncate">Shop</p>
              <p className="text-white/50 text-[11px] truncate">{priceHint}</p>
            </div>
          </Link>
          <div className="flex items-center gap-2 shrink-0">
            {canAddToCart ? (
              <>
                <Link href="/orders" className="ev-btn-secondary text-sm py-2 px-3 inline-flex items-center gap-1.5">
                  Orders
                </Link>
                <Link href="/cart" className="ev-btn-secondary text-sm py-2 px-3 inline-flex items-center gap-1.5">
                  <ShoppingCart size={15} />
                  Cart
                </Link>
              </>
            ) : null}
            <Link href="/login" className="text-white/70 hover:text-white text-sm hidden sm:inline transition-colors">
              Sign in
            </Link>
            <Link href="/" className="ev-btn-secondary text-sm py-2 px-3">
              Home
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-ev-text tracking-tight">Camera &amp; gear catalogue</h1>
            <p className="text-ev-muted text-sm mt-1 max-w-xl">
              Browse listings from partner shops. Prices reflect your account type when signed in.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
            <div className="relative flex-1 min-w-[200px]">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ev-subtle" />
              <input
                className="ev-input pl-9 py-2.5 text-sm"
                placeholder="Search by name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="relative sm:w-48">
              <SlidersHorizontal size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ev-subtle pointer-events-none" />
              <select
                className="ev-input pl-9 py-2.5 text-sm appearance-none cursor-pointer"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
              >
                <option value="">All categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.parent_id ? `↳ ${c.name}` : c.name}
                  </option>
                ))}
              </select>
            </div>
            <input
              className="ev-input py-2.5 text-sm sm:w-40"
              placeholder="Brand"
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 text-ev-muted gap-3">
            <Loader2 className="animate-spin text-ev-primary" size={28} />
            <span className="text-sm">Loading products…</span>
          </div>
        ) : products.length === 0 ? (
          <div className="ev-card p-16 text-center text-ev-muted">
            <ShoppingBag className="mx-auto mb-3 opacity-40" size={36} />
            <p className="font-medium text-ev-text mb-1">No products yet</p>
            <p className="text-sm">Check back soon — shops are onboarding.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
            {products.map((p) => {
              const img = p.images?.[0];
              return (
                <article
                  key={p.id}
                  className="ev-card overflow-hidden flex flex-col hover:border-ev-primary/40 hover:shadow-ev-md transition-all duration-300"
                >
                  <div className="relative aspect-[4/3] bg-ev-surface2 border-b border-ev-border overflow-hidden">
                    {img ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={img} alt={p.name} className="absolute inset-0 w-full h-full object-cover" />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-ev-subtle text-sm">No image</div>
                    )}
                  </div>
                  <div className="p-5 flex-1 flex flex-col">
                    <p className="text-ev-subtle text-xs uppercase tracking-wide mb-1 truncate">{p.shop_name || 'Partner shop'}</p>
                    <Link href={`/shop/${p.id}`} className="text-ev-text font-semibold text-lg leading-snug line-clamp-2 hover:text-ev-primary transition-colors">
                      {p.name}
                    </Link>
                    {p.brand ? <p className="text-ev-muted text-xs mt-1">{p.brand}</p> : null}
                    <p className="text-ev-muted text-sm mt-2 line-clamp-2 flex-1">{p.description}</p>
                    <div className="mt-4 flex items-end justify-between gap-3">
                      <div>
                        <p className="text-2xl font-bold text-ev-text">{displayPrice(p, role)}</p>
                        {p.stock != null ? (
                          <p className="text-ev-subtle text-xs mt-0.5">{p.stock > 0 ? `${p.stock} in stock` : 'Out of stock'}</p>
                        ) : null}
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span className="text-ev-primary text-xs font-semibold whitespace-nowrap">Multi-shop</span>
                        {canAddToCart ? (
                          <button
                            type="button"
                            className="ev-btn-secondary text-xs py-1.5 px-3 inline-flex items-center gap-1"
                            onClick={async () => {
                              try {
                                await cartApi.addItem(p.id, 1);
                                toast.success('Added to cart');
                              } catch {
                                toast.error('Could not add to cart');
                              }
                            }}
                          >
                            <Plus size={14} />
                            Add
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
