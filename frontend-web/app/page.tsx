'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  BadgePercent,
  Camera,
  Clock,
  Heart,
  Loader2,
  Plus,
  ShieldCheck,
  Sparkles,
  Truck,
  Wrench,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { cartApi, catalogApi } from '@/lib/api';
import { PublicShell } from '@/components/public/PublicShell';
import { publicBrandName } from '@/lib/public-brand';
import { getRole, isLoggedIn } from '@/lib/auth';
import { isInWishlist, toggleWishlistId } from '@/lib/wishlist';

type Product = {
  id: string;
  name: string;
  price_customer?: number;
  images?: string[];
  shop_name?: string | null;
  stock?: number;
};

type Category = { id: string; name: string };

const CATEGORY_LABELS = [
  'DSLR Cameras',
  'Mirrorless',
  'Lenses',
  'Action Cameras',
  'Tripods & Mounts',
  'Memory Cards',
  'Bags & Cases',
  'Lighting',
  'Filters',
  'Accessories',
];

function formatInr(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
}

function DealCountdown() {
  const [left, setLeft] = useState(4 * 3600 + 32 * 60 + 18);
  useEffect(() => {
    const id = window.setInterval(() => setLeft((s) => Math.max(0, s - 1)), 1000);
    return () => window.clearInterval(id);
  }, []);
  const h = Math.floor(left / 3600);
  const m = Math.floor((left % 3600) / 60);
  const s = left % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    <span className="font-mono text-ev-text font-semibold">
      {pad(h)}h {pad(m)}m {pad(s)}s
    </span>
  );
}

export default function HomePage() {
  const [featured, setFeatured] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [, setWishBump] = useState(0);
  const role = typeof window !== 'undefined' ? getRole() : undefined;
  const canBuy = role === 'customer' || role === 'dealer';
  const [hidePartnerSignup, setHidePartnerSignup] = useState(false);
  useEffect(() => {
    if (isLoggedIn()) setHidePartnerSignup(true);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [catRes, prodRes] = await Promise.all([
          catalogApi.getCategories().catch(() => ({ data: [] })),
          catalogApi.getProducts({}),
        ]);
        if (cancelled) return;
        setCategories(Array.isArray(catRes.data) ? catRes.data : []);
        const prods = Array.isArray(prodRes.data) ? (prodRes.data as Product[]) : [];
        setFeatured(prods.slice(0, 6));
      } catch {
        if (!cancelled) toast.error('Could not load featured products');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const categoryHref = (label: string, index: number) => {
    const match = categories.find((c) => c.name.toLowerCase().includes(label.split(' ')[0].toLowerCase()));
    if (match) return `/shop?category_id=${encodeURIComponent(match.id)}`;
    if (categories[index]) return `/shop?category_id=${encodeURIComponent(categories[index].id)}`;
    return `/shop?search=${encodeURIComponent(label)}`;
  };

  return (
    <PublicShell>
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-20 left-1/4 w-96 h-96 bg-ev-primary/10 rounded-full blur-3xl" />
          <div className="absolute bottom-10 right-1/4 w-80 h-80 bg-ev-accent/8 rounded-full blur-3xl" />
        </div>
        <div className="ev-container pt-12 pb-16 md:pt-16 md:pb-20 relative">
          <p className="text-ev-primary font-semibold text-xs uppercase tracking-[0.2em] mb-4 text-center">
            New arrivals · Best deals · Top brands
          </p>
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-[3.25rem] font-extrabold text-ev-text tracking-tight leading-[1.12] mb-4">
              Professional Cameras &amp; Accessories — All in One Place
            </h1>
            <p className="text-ev-muted text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
              Shop from 4 expert stores. Exclusive prices for dealers. Expert technician services at your doorstep.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/shop" className="ev-btn-primary inline-flex items-center justify-center gap-2 text-base py-3.5 px-8">
                Shop Now <ArrowRight size={18} />
              </Link>
              <Link href="/deals" className="ev-btn-secondary inline-flex items-center justify-center gap-2 text-base py-3.5 px-8">
                Browse Deals
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-ev-border bg-ev-surface2/50 py-10">
        <div className="ev-container">
          <h2 className="text-ev-text font-bold text-lg mb-4 text-center">Shop by category</h2>
          <div className="flex flex-wrap justify-center gap-2">
            {CATEGORY_LABELS.map((label, i) => (
              <Link
                key={label}
                href={categoryHref(label, i)}
                className="px-3 py-2 rounded-full border border-ev-border bg-ev-surface text-ev-text text-sm hover:border-ev-primary/40 hover:text-ev-primary transition-colors"
              >
                {label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="ev-container py-12 sm:py-16" id="trending">
        <div className="text-center mb-10">
          <h2 className="text-2xl md:text-3xl font-bold text-ev-text">Trending right now</h2>
          <p className="text-ev-muted text-sm mt-2">Handpicked by our expert stores</p>
        </div>
        {loading ? (
          <div className="flex justify-center py-16 text-ev-muted gap-2">
            <Loader2 className="animate-spin text-ev-primary" size={24} /> Loading products…
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {featured.map((p) => {
              const img = p.images?.[0];
              const price = Number(p.price_customer || 0);
              const wished = isInWishlist(p.id);
              return (
                <article key={p.id} className="ev-card overflow-hidden flex flex-col group">
                  <Link href={`/products/${p.id}`} className="relative aspect-[4/3] bg-ev-surface2 border-b border-ev-border block">
                    {img ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={img} alt="" className="absolute inset-0 w-full h-full object-cover" />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-ev-muted text-sm">No image</div>
                    )}
                    <button
                      type="button"
                      className="absolute top-3 right-3 w-9 h-9 rounded-full bg-ev-surface/95 border border-ev-border flex items-center justify-center shadow-ev-sm hover:border-ev-primary transition-colors"
                      aria-label={wished ? 'Remove from wishlist' : 'Add to wishlist'}
                      onClick={(e) => {
                        e.preventDefault();
                        toggleWishlistId(p.id);
                        setWishBump((n) => n + 1);
                        window.dispatchEvent(new Event('ev-wishlist'));
                      }}
                    >
                      <Heart size={18} className={wished ? 'text-ev-primary fill-ev-primary' : 'text-ev-muted'} />
                    </button>
                  </Link>
                  <div className="p-5 flex-1 flex flex-col">
                    <p className="text-ev-subtle text-xs uppercase tracking-wide mb-1 truncate">{p.shop_name || 'Partner shop'}</p>
                    <Link href={`/products/${p.id}`} className="text-ev-text font-semibold text-lg hover:text-ev-primary transition-colors line-clamp-2">
                      {p.name}
                    </Link>
                    <p className="text-2xl font-bold text-ev-text mt-3">{price > 0 ? formatInr(price) : '—'}</p>
                    <div className="mt-auto pt-4 flex items-center gap-2">
                      {canBuy ? (
                        <button
                          type="button"
                          className="ev-btn-primary flex-1 text-sm py-2.5 inline-flex items-center justify-center gap-1.5"
                          onClick={async () => {
                            try {
                              await cartApi.addItem(p.id, 1);
                              toast.success('Added to cart');
                            } catch {
                              toast.error('Sign in to add to cart');
                            }
                          }}
                        >
                          <Plus size={16} /> Add to cart
                        </button>
                      ) : (
                        <Link href="/login" className="ev-btn-primary flex-1 text-sm py-2.5 text-center">
                          Sign in to buy
                        </Link>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
        <div className="text-center mt-10">
          <Link href="/shop" className="text-ev-primary font-semibold inline-flex items-center gap-1 hover:underline">
            View all products <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      <section className="py-16 px-4 sm:px-6 bg-ev-surface2/40 border-y border-ev-border">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
            <div>
              <h2 className="text-2xl font-bold text-ev-text">Today&apos;s best deals</h2>
              <p className="text-ev-muted text-sm mt-1">Limited-time pricing from partner stores</p>
            </div>
            <p className="text-sm text-ev-muted">
              Ends in: <DealCountdown />
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {featured.slice(0, 3).map((p) => {
              const base = Number(p.price_customer || 0);
              const deal = Math.round(base * 0.88);
              const off = base > 0 ? Math.round(((base - deal) / base) * 100) : 12;
              return (
                <Link key={p.id} href={`/products/${p.id}`} className="ev-card p-5 hover:border-ev-primary/30 transition-colors flex flex-col">
                  <p className="text-ev-text font-semibold line-clamp-2">{p.name}</p>
                  <p className="text-ev-subtle text-xs mt-1 truncate">{p.shop_name || 'Partner shop'}</p>
                  <div className="mt-4 flex items-baseline gap-2 flex-wrap">
                    <span className="text-ev-muted line-through text-sm">{base > 0 ? formatInr(base) : '—'}</span>
                    <span className="text-ev-primary font-bold text-xl">{deal > 0 ? formatInr(deal) : formatInr(base)}</span>
                    <span className="text-[11px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-ev-success/15 text-ev-success border border-ev-success/25">
                      {off}% off
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <section className="py-16 px-4 sm:px-6 max-w-5xl mx-auto">
        <h2 className="text-2xl font-bold text-ev-text text-center mb-10">Why {publicBrandName}?</h2>
        <ul className="space-y-4">
          {[
            { icon: Camera, t: '4 verified expert stores — all in one place' },
            { icon: Truck, t: 'Fast delivery via trusted courier partners' },
            { icon: Wrench, t: 'Expert technician services after purchase' },
            { icon: ShieldCheck, t: '100% secure payments via Razorpay' },
            { icon: BadgePercent, t: 'Exclusive dealer pricing for bulk buyers' },
          ].map(({ icon: Icon, t }) => (
            <li key={t} className="flex gap-4 ev-card p-4 items-start">
              <div className="w-10 h-10 rounded-xl bg-ev-primary/10 flex items-center justify-center shrink-0">
                <Icon size={20} className="text-ev-primary" />
              </div>
              <p className="text-ev-text text-sm leading-relaxed pt-1.5">{t}</p>
            </li>
          ))}
        </ul>
      </section>

      {!hidePartnerSignup ? (
        <section className="px-4 sm:px-6 pb-16 max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="ev-card p-8 md:p-10 border-ev-primary/20 bg-gradient-to-br from-ev-surface to-ev-primary/5">
            <Sparkles className="text-ev-primary mb-3" size={22} />
            <h2 className="text-xl md:text-2xl font-bold text-ev-text mb-2">Are you a dealer or distributor?</h2>
            <p className="text-ev-muted text-sm md:text-base mb-6">
              Get exclusive wholesale pricing, GST invoices, and bulk order support. Register your business and unlock dealer prices today.
            </p>
            <Link href="/register?role=dealer" className="ev-btn-primary inline-flex items-center gap-2">
              Register as Dealer <ArrowRight size={16} />
            </Link>
          </div>
          <div className="ev-card p-8 md:p-10 border-ev-border">
            <Clock className="text-ev-primary mb-3" size={22} />
            <h2 className="text-xl md:text-2xl font-bold text-ev-text mb-2">Are you an electrician or technician?</h2>
            <p className="text-ev-muted text-sm md:text-base mb-6">
              Join our technician network. Get job requests from verified customers in your area. Flexible hours, real earnings.
            </p>
            <Link href="/technician/register" className="ev-btn-secondary inline-flex items-center gap-2">
              Join as Technician <ArrowRight size={16} />
            </Link>
          </div>
        </section>
      ) : null}
    </PublicShell>
  );
}
