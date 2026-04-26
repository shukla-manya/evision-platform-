'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Heart, Loader2, Plus, Search, ShoppingBag, SlidersHorizontal } from 'lucide-react';
import toast from 'react-hot-toast';
import { cartApi, catalogApi } from '@/lib/api';
import { getRole } from '@/lib/auth';
import { PublicShell } from '@/components/public/PublicShell';
import { isInWishlist, toggleWishlistId } from '@/lib/wishlist';

type Product = {
  id: string;
  name: string;
  description?: string;
  price_customer?: number;
  price_dealer?: number;
  mrp?: number;
  min_order_quantity?: number;
  images?: string[];
  stock?: number;
  shop_name?: string | null;
  brand?: string | null;
  category_id?: string;
  rating_avg?: number;
};

type Category = { id: string; name: string; parent_id?: string | null };

type SortKey = 'relevance' | 'price_asc' | 'price_desc' | 'newest' | 'rating';

function formatInr(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
}

function displayPrice(p: Product, role?: string | null) {
  if (role === 'dealer') {
    const v = p.price_dealer;
    if (v == null || Number.isNaN(Number(v))) return '—';
    return formatInr(Number(v));
  }
  const v = p.price_customer;
  if (v == null || Number.isNaN(Number(v))) return '—';
  return formatInr(Number(v));
}

function dealerMinQty(p: Product) {
  return Math.max(1, Number(p.min_order_quantity || 1));
}

function Stars({ value }: { value: number }) {
  const full = Math.round(Math.min(5, Math.max(0, value)));
  return (
    <span className="text-ev-warning text-xs tracking-tight" aria-hidden>
      {'★'.repeat(full)}
      {'☆'.repeat(5 - full)}
    </span>
  );
}

function ShopListingInner() {
  const searchParams = useSearchParams();
  const [rawProducts, setRawProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [brand, setBrand] = useState('');
  const [shopFilter, setShopFilter] = useState('');
  const [approvedShopsOnly, setApprovedShopsOnly] = useState(true);
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [inStockOnly, setInStockOnly] = useState(false);
  const [minRating, setMinRating] = useState('');
  const [sort, setSort] = useState<SortKey>('relevance');
  const [wishTick, setWishTick] = useState(0);
  const refreshWishlist = useCallback(() => setWishTick((n) => n + 1), []);
  void wishTick;

  const role = typeof window !== 'undefined' ? getRole() : undefined;
  const canAddToCart = role === 'customer' || role === 'dealer';

  useEffect(() => {
    const q = (searchParams.get('search') || searchParams.get('q') || '').trim();
    queueMicrotask(() => {
      if (q) setSearch(q);
      const sortParam = searchParams.get('sort');
      if (sortParam === 'newest' || sortParam === 'price_asc' || sortParam === 'price_desc' || sortParam === 'rating') {
        setSort(sortParam);
      }
      const cat = searchParams.get('category_id');
      if (cat) setCategoryId(cat);
    });
  }, [searchParams]);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const [catRes, prodRes] = await Promise.all([
        catalogApi.getCategories(),
        catalogApi.getProducts({
          search: search.trim() || undefined,
          category_id: categoryId || undefined,
          brand: brand.trim() || undefined,
          min_price: minPrice ? Number(minPrice) : undefined,
          max_price: maxPrice ? Number(maxPrice) : undefined,
          approved_shops_only: approvedShopsOnly,
        }),
      ]);
      setCategories(Array.isArray(catRes.data) ? catRes.data : []);
      setRawProducts(Array.isArray(prodRes.data) ? prodRes.data : []);
    } catch {
      setLoadError(true);
      setCategories([]);
      setRawProducts([]);
      toast.error('Could not load catalogue');
    } finally {
      setLoading(false);
    }
  }, [search, categoryId, brand, minPrice, maxPrice, approvedShopsOnly]);

  useEffect(() => {
    const t = setTimeout(() => load(), 300);
    return () => clearTimeout(t);
  }, [load]);

  const products = useMemo(() => {
    let list = [...rawProducts];
    if (shopFilter.trim()) {
      const s = shopFilter.trim().toLowerCase();
      list = list.filter((p) => String(p.shop_name || '').toLowerCase().includes(s));
    }
    if (inStockOnly) list = list.filter((p) => p.stock == null || Number(p.stock) > 0);
    const mr = Number(minRating);
    if (minRating && !Number.isNaN(mr)) {
      list = list.filter((p) => Number(p.rating_avg || 0) >= mr);
    }
    const priceVal = (p: Product) => Number(role === 'dealer' ? p.price_dealer ?? p.price_customer : p.price_customer ?? 0);
    if (sort === 'price_asc') list.sort((a, b) => priceVal(a) - priceVal(b));
    if (sort === 'price_desc') list.sort((a, b) => priceVal(b) - priceVal(a));
    if (sort === 'newest') list.sort(() => 0);
    if (sort === 'rating') list.sort((a, b) => Number(b.rating_avg || 0) - Number(a.rating_avg || 0));
    return list;
  }, [rawProducts, shopFilter, inStockOnly, minRating, sort, role]);

  return (
    <PublicShell>
      <main className="ev-container py-6 sm:py-8">
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-ev-text tracking-tight">All Cameras &amp; Accessories</h1>
          <p className="text-ev-muted text-sm mt-1">Browse every listing from partner stores in one catalogue.</p>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          <aside className="w-full lg:w-64 shrink-0 space-y-4">
            <div className="ev-card p-4 space-y-3">
              <p className="text-ev-text font-semibold text-sm flex items-center gap-2">
                <SlidersHorizontal size={16} className="text-ev-primary" />
                Filters
              </p>
              <div>
                <label className="ev-label text-xs">Category</label>
                <select
                  className="ev-input py-2 text-sm w-full mt-1"
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                >
                  <option value="">All</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.parent_id ? `↳ ${c.name}` : c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="ev-label text-xs">Min ₹</label>
                  <input
                    className="ev-input py-2 text-sm mt-1"
                    inputMode="numeric"
                    value={minPrice}
                    onChange={(e) => setMinPrice(e.target.value.replace(/\D/g, ''))}
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="ev-label text-xs">Max ₹</label>
                  <input
                    className="ev-input py-2 text-sm mt-1"
                    inputMode="numeric"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(e.target.value.replace(/\D/g, ''))}
                    placeholder="Any"
                  />
                </div>
              </div>
              <div>
                <label className="ev-label text-xs">Brand</label>
                <input
                  className="ev-input py-2 text-sm mt-1"
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  placeholder="Canon, Sony…"
                />
              </div>
              <div>
                <label className="ev-label text-xs">Shop / store name</label>
                <input
                  className="ev-input py-2 text-sm mt-1"
                  value={shopFilter}
                  onChange={(e) => setShopFilter(e.target.value)}
                  placeholder="Filter list by name…"
                />
                <label className="flex items-start gap-2.5 text-sm text-ev-text cursor-pointer mt-3">
                  <input
                    type="checkbox"
                    checked={approvedShopsOnly}
                    onChange={(e) => setApprovedShopsOnly(e.target.checked)}
                    className="rounded border-ev-border mt-0.5 shrink-0"
                  />
                  <span>
                    <span className="font-medium text-ev-text leading-snug block">Approved shops only</span>
                    <span className="text-ev-muted text-xs leading-relaxed block mt-0.5">
                      On: only verified partner stores and the products they listed. Off: include shops still in review
                      or suspended.
                    </span>
                  </span>
                </label>
              </div>
              <div>
                <label className="ev-label text-xs">Minimum rating</label>
                <select
                  className="ev-input py-2 text-sm w-full mt-1"
                  value={minRating}
                  onChange={(e) => setMinRating(e.target.value)}
                >
                  <option value="">Any</option>
                  <option value="4">4+</option>
                  <option value="3">3+</option>
                </select>
              </div>
              <label className="flex items-center gap-2 text-sm text-ev-text cursor-pointer">
                <input type="checkbox" checked={inStockOnly} onChange={(e) => setInStockOnly(e.target.checked)} className="rounded border-ev-border" />
                In stock only
              </label>
            </div>
          </aside>

          <div className="flex-1 min-w-0 space-y-4">
            <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
              <div className="relative flex-1 min-w-0">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ev-subtle" />
                <input
                  className="ev-input pl-9 py-2.5 text-sm w-full"
                  placeholder="Search products…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <select
                className="ev-input py-2.5 text-sm sm:w-56 shrink-0"
                value={sort}
                onChange={(e) => setSort(e.target.value as SortKey)}
              >
                <option value="relevance">Relevance</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
                <option value="newest">Newest</option>
                <option value="rating">Best rated</option>
              </select>
            </div>

            {loadError && !loading ? (
              <div className="ev-card p-12 text-center space-y-4">
                <p className="text-ev-text font-medium">We couldn&apos;t load the catalogue.</p>
                <p className="text-ev-muted text-sm">Check your connection or try again in a moment.</p>
                <button type="button" className="ev-btn-primary text-sm py-2 px-5" onClick={() => void load()}>
                  Try again
                </button>
              </div>
            ) : loading ? (
              <div className="flex flex-col items-center justify-center py-24 text-ev-muted gap-3">
                <Loader2 className="animate-spin text-ev-primary" size={28} />
                <span className="text-sm">Loading products…</span>
              </div>
            ) : products.length === 0 ? (
              <div className="ev-card p-16 text-center text-ev-muted">
                <ShoppingBag className="mx-auto mb-3 opacity-40" size={36} />
                <p className="font-medium text-ev-text mb-1">No products found for this filter.</p>
                <p className="text-sm">Try adjusting your search.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                {products.map((p) => {
                  const img = p.images?.[0];
                  const rating = Number(p.rating_avg || 0);
                  const wished = isInWishlist(p.id);
                  return (
                    <article
                      key={p.id}
                      className="ev-card overflow-hidden flex flex-col hover:border-ev-primary/40 hover:shadow-ev-md transition-all duration-300"
                    >
                      <div className="relative aspect-[4/3] bg-ev-surface2 border-b border-ev-border overflow-hidden">
                        <Link href={`/products/${p.id}`} className="absolute inset-0 block">
                          {img ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={img} alt="" className="absolute inset-0 w-full h-full object-cover" />
                          ) : (
                            <div className="absolute inset-0 flex items-center justify-center text-ev-subtle text-sm">No image</div>
                          )}
                        </Link>
                        <button
                          type="button"
                          className="absolute top-3 right-3 w-9 h-9 rounded-full bg-ev-surface/95 border border-ev-border flex items-center justify-center shadow-ev-sm hover:border-ev-primary z-10"
                          aria-label="Wishlist"
                          onClick={() => {
                            toggleWishlistId(p.id);
                            refreshWishlist();
                          }}
                        >
                          <Heart size={18} className={wished ? 'text-ev-primary fill-ev-primary' : 'text-ev-muted'} />
                        </button>
                      </div>
                      <div className="p-5 flex-1 flex flex-col">
                        <p className="text-ev-subtle text-xs uppercase tracking-wide mb-1 truncate">{p.shop_name || 'Partner shop'}</p>
                        <Link href={`/products/${p.id}`} className="text-ev-text font-semibold text-lg leading-snug line-clamp-2 hover:text-ev-primary transition-colors">
                          {p.name}
                        </Link>
                        <div className="mt-1 flex items-center gap-2">
                          {rating > 0 ? (
                            <>
                              <Stars value={rating} />
                              <span className="text-ev-muted text-xs">{rating.toFixed(1)}</span>
                            </>
                          ) : (
                            <span className="text-ev-subtle text-xs">New</span>
                          )}
                        </div>
                        <div className="mt-3 space-y-1">
                          {role === 'dealer' ? (
                            <>
                              <span className="inline-flex items-center rounded-md bg-ev-indigo/15 text-ev-indigo text-[10px] font-bold uppercase tracking-wide px-2 py-0.5">
                                Dealer price
                              </span>
                              <p className="text-2xl font-bold text-ev-text">{displayPrice(p, role)}</p>
                              {Number(p.mrp) > 0 && Number(p.price_dealer) > 0 ? (
                                <p className="text-xs text-ev-muted">
                                  <span className="text-ev-success font-semibold">
                                    You save {formatInr(Math.max(0, Number(p.mrp) - Number(p.price_dealer)))} vs retail
                                  </span>
                                  <span className="mx-1">·</span>
                                  <span className="line-through text-ev-subtle">MRP {formatInr(Number(p.mrp))}</span>
                                </p>
                              ) : null}
                              {dealerMinQty(p) > 1 ? (
                                <p className="text-[11px] text-ev-warning font-medium">Minimum order: {dealerMinQty(p)} units</p>
                              ) : null}
                            </>
                          ) : (
                            <p className="text-2xl font-bold text-ev-text">{displayPrice(p, role)}</p>
                          )}
                        </div>
                        <div className="mt-auto pt-4">
                          {canAddToCart ? (
                            <button
                              type="button"
                              className="ev-btn-primary w-full text-sm py-2.5 inline-flex items-center justify-center gap-1.5"
                              onClick={async () => {
                                try {
                                  const n = role === 'dealer' ? dealerMinQty(p) : 1;
                                  await cartApi.addItem(p.id, n);
                                  toast.success(role === 'dealer' ? `Added ${n} to cart (minimum order)` : 'Added to cart');
                                } catch (err: unknown) {
                                  const msg = err && typeof err === 'object' && 'response' in err
                                    ? String((err as { response?: { data?: { message?: string } } }).response?.data?.message || '')
                                    : '';
                                  toast.error(msg || 'Could not add to cart');
                                }
                              }}
                            >
                              <Plus size={16} /> Add to cart
                            </button>
                          ) : (
                            <Link href="/login" className="ev-btn-secondary w-full text-sm py-2.5 block text-center">
                              Sign in to add to cart
                            </Link>
                          )}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>
    </PublicShell>
  );
}

export default function ShopPage() {
  return (
    <Suspense
      fallback={
        <PublicShell>
          <div className="flex justify-center py-24 text-ev-muted gap-2">
            <Loader2 className="animate-spin text-ev-primary" size={28} /> Loading…
          </div>
        </PublicShell>
      }
    >
      <ShopListingInner />
    </Suspense>
  );
}
