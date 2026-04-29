'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ChevronDown, ChevronRight, ChevronUp, Heart, Loader2, Plus, Search, ShoppingBag, SlidersHorizontal, Star } from 'lucide-react';
import toast from 'react-hot-toast';
import { cartApi, catalogApi } from '@/lib/api';
import { getRole } from '@/lib/auth';
import { PublicShell } from '@/components/public/PublicShell';
import { PublicTrustStrip } from '@/components/public/PublicTrustStrip';
import { isInWishlist, toggleWishlistId } from '@/lib/wishlist';
import { publicShopBrandMark } from '@/lib/public-brand';
import { aboutBrandSummary } from '@/lib/about-company-content';
import { siteQuickLinks } from '@/lib/site-quick-links';
import {
  publicMarketingEmail,
  publicRegisteredAddress,
  publicSalesPhone,
  publicSupportEmail,
  publicSupportPhone,
} from '@/lib/public-contact';

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

type ApprovedShopRow = { id: string; shop_name: string };

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

function StarRow({ rating }: { rating: number }) {
  const full = Math.floor(rating);
  const partial = rating - full >= 0.5;
  return (
    <div className="flex items-center gap-0.5 text-amber-500" aria-label={`Rated ${rating.toFixed(2)} out of 5`}>
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          size={12}
          className={
            i < full ? 'fill-amber-400 text-amber-500' : i === full && partial ? 'fill-amber-400/60 text-amber-500' : 'fill-none text-ev-border'
          }
          aria-hidden
        />
      ))}
      <span className="text-ev-muted text-xs ml-1 tabular-nums">Rated {rating.toFixed(2)} out of 5</span>
    </div>
  );
}

function isHotProduct(p: Product): boolean {
  const r = Number(p.rating_avg || 0);
  const st = p.stock == null ? true : Number(p.stock) > 0;
  return st && r >= 4.65;
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
  const [approvedShopDirectory, setApprovedShopDirectory] = useState<ApprovedShopRow[]>([]);
  const [shopsPanelOpen, setShopsPanelOpen] = useState(false);
  const [approvedShopsOnly, setApprovedShopsOnly] = useState(true);
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [inStockOnly, setInStockOnly] = useState(false);
  const [minRating, setMinRating] = useState('');
  const [sort, setSort] = useState<SortKey>('price_asc');
  const [wishTick, setWishTick] = useState(0);
  const refreshWishlist = useCallback(() => setWishTick((n) => n + 1), []);
  void wishTick;
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);

  const role = typeof window !== 'undefined' ? getRole() : undefined;
  const canAddToCart = role === 'customer' || role === 'dealer';

  const priceVal = useCallback(
    (p: Product) => Number(role === 'dealer' ? p.price_dealer ?? p.price_customer : p.price_customer ?? 0),
    [role],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await catalogApi.getApprovedShops();
        if (cancelled) return;
        setApprovedShopDirectory(Array.isArray(data) ? (data as ApprovedShopRow[]) : []);
      } catch {
        if (!cancelled) setApprovedShopDirectory([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const q = (searchParams.get('search') || searchParams.get('q') || '').trim();
    queueMicrotask(() => {
      if (q) setSearch(q);
      const sortParam = searchParams.get('sort');
      if (
        sortParam === 'relevance' ||
        sortParam === 'newest' ||
        sortParam === 'price_asc' ||
        sortParam === 'price_desc' ||
        sortParam === 'rating'
      ) {
        setSort(sortParam);
      }
      const cat = searchParams.get('category_id');
      if (cat) setCategoryId(cat);
    });
  }, [searchParams]);

  useEffect(() => {
    setPage(1);
  }, [search, categoryId, brand, minPrice, maxPrice, shopFilter, inStockOnly, minRating, approvedShopsOnly, sort, pageSize]);

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
      list = list.filter((p) => String(p.shop_name || '').trim().toLowerCase() === s);
    }
    if (inStockOnly) list = list.filter((p) => p.stock == null || Number(p.stock) > 0);
    const mr = Number(minRating);
    if (minRating && !Number.isNaN(mr)) {
      list = list.filter((p) => Number(p.rating_avg || 0) >= mr);
    }
    if (sort === 'price_asc') list.sort((a, b) => priceVal(a) - priceVal(b));
    if (sort === 'price_desc') list.sort((a, b) => priceVal(b) - priceVal(a));
    if (sort === 'newest') list.sort(() => 0);
    if (sort === 'rating') list.sort((a, b) => Number(b.rating_avg || 0) - Number(a.rating_avg || 0));
    return list;
  }, [rawProducts, shopFilter, inStockOnly, minRating, sort, priceVal]);

  const categoryCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of rawProducts) {
      const id = String(p.category_id || '');
      if (!id) continue;
      m.set(id, (m.get(id) || 0) + 1);
    }
    return m;
  }, [rawProducts]);

  const cataloguePriceExtent = useMemo(() => {
    let min = Infinity;
    let max = -Infinity;
    for (const p of rawProducts) {
      const v = priceVal(p);
      if (v > 0) {
        min = Math.min(min, v);
        max = Math.max(max, v);
      }
    }
    if (!Number.isFinite(min)) return { min: 0, max: 0 };
    return { min: Math.floor(min), max: Math.ceil(max) };
  }, [rawProducts, priceVal]);

  const totalFiltered = products.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageStart = totalFiltered === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const pageEnd = Math.min(safePage * pageSize, totalFiltered);
  const pageProducts = useMemo(
    () => products.slice((safePage - 1) * pageSize, safePage * pageSize),
    [products, safePage, pageSize],
  );

  useEffect(() => {
    setPage((p) => Math.min(p, Math.max(1, Math.ceil(totalFiltered / pageSize) || 1)));
  }, [totalFiltered, pageSize]);

  const appliedMin = minPrice ? Number(minPrice) : cataloguePriceExtent.min;
  const appliedMax = maxPrice ? Number(maxPrice) : cataloguePriceExtent.max;
  const priceBandLabel =
    cataloguePriceExtent.max > 0
      ? `Price: ${formatInr(appliedMin || cataloguePriceExtent.min)} — ${formatInr(appliedMax || cataloguePriceExtent.max)}`
      : 'Price: —';

  return (
    <PublicShell>
      <a href="#shop-main" className="ev-skip-link">
        Skip to main content
      </a>
      <a href="#site-navigation" className="ev-skip-link--nav">
        Skip to navigation
      </a>
      <PublicTrustStrip />
      <main id="shop-main" className="min-w-0">
        <div className="ev-container py-6 sm:py-8">
        <nav className="text-sm text-ev-muted mb-3 flex items-center gap-1.5 flex-wrap" aria-label="Breadcrumb">
          <Link href="/" className="hover:text-ev-primary">
            Home
          </Link>
          <ChevronRight size={14} className="text-ev-subtle shrink-0" aria-hidden />
          <span className="text-ev-text font-medium">Shop</span>
        </nav>
        <div className="mb-8 border-b border-ev-border pb-8">
          <p className="text-ev-primary font-bold text-xs sm:text-sm tracking-[0.28em] uppercase mb-2">{publicShopBrandMark}</p>
          <h1 className="text-2xl sm:text-3xl font-bold text-ev-text tracking-tight">Shop</h1>
          <p className="text-ev-muted text-sm mt-2 max-w-2xl">
            Search products, filter by category and price, and sort like the full storefront — all listings from approved partner
            shops.
          </p>
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
                <label className="ev-label text-xs" id="shop-filter-label">
                  Shop / store name
                </label>
                <button
                  type="button"
                  id="shop-filter-toggle"
                  aria-expanded={shopsPanelOpen}
                  aria-controls="shop-filter-list"
                  aria-labelledby="shop-filter-label shop-filter-toggle"
                  onClick={() => setShopsPanelOpen((o) => !o)}
                  className="ev-input py-2.5 text-sm w-full mt-1 flex items-center justify-between gap-2 text-left text-ev-text hover:border-ev-primary/40 transition-colors"
                >
                  <span className={shopFilter ? 'font-medium text-ev-text truncate' : 'text-ev-muted'}>
                    {shopFilter || 'All shops'}
                  </span>
                  {shopsPanelOpen ? <ChevronUp size={18} className="text-ev-muted shrink-0" /> : <ChevronDown size={18} className="text-ev-muted shrink-0" />}
                </button>
                {shopsPanelOpen ? (
                  <div
                    id="shop-filter-list"
                    role="listbox"
                    className="mt-2 max-h-52 overflow-y-auto rounded-xl border border-ev-border bg-ev-surface2/60 p-2 space-y-1.5"
                  >
                    <button
                      type="button"
                      role="option"
                      aria-selected={!shopFilter}
                      onClick={() => {
                        setShopFilter('');
                        setShopsPanelOpen(false);
                      }}
                      className={`w-full text-left text-sm py-2.5 px-3 rounded-lg border transition-colors ${
                        !shopFilter
                          ? 'border-ev-primary bg-ev-primary/10 text-ev-text font-semibold'
                          : 'border-transparent text-ev-muted hover:bg-ev-surface hover:text-ev-text'
                      }`}
                    >
                      All shops
                    </button>
                    {approvedShopDirectory.length === 0 ? (
                      <p className="text-ev-subtle text-xs px-2 py-2">No approved shops in the directory yet.</p>
                    ) : (
                      approvedShopDirectory.map((row) => {
                        const selected = shopFilter === row.shop_name;
                        return (
                          <button
                            key={row.id}
                            type="button"
                            role="option"
                            aria-selected={selected}
                            onClick={() => {
                              setShopFilter(row.shop_name);
                              setShopsPanelOpen(false);
                            }}
                            className={`w-full text-left text-sm py-2.5 px-3 rounded-lg border transition-colors truncate ${
                              selected
                                ? 'border-ev-primary bg-ev-primary/10 text-ev-text font-semibold'
                                : 'border-transparent text-ev-text hover:bg-ev-surface'
                            }`}
                          >
                            {row.shop_name}
                          </button>
                        );
                      })
                    )}
                  </div>
                ) : null}
                <label className="flex items-start gap-2.5 text-sm text-ev-text cursor-pointer mt-3">
                  <input
                    type="checkbox"
                    checked={approvedShopsOnly}
                    onChange={(e) => setApprovedShopsOnly(e.target.checked)}
                    className="rounded border-ev-border mt-0.5 shrink-0"
                  />
                  <span className="font-medium text-ev-text leading-snug">Approved shops only</span>
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
                <p className="font-medium text-ev-text">No products in the catalogue right now.</p>
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
