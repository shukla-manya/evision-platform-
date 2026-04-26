'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Clock,
  CreditCard,
  Heart,
  Layers,
  Loader2,
  Plus,
  Receipt,
  Sparkles,
  Store,
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
          catalogApi.getProducts({ approved_shops_only: true }),
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
            New arrivals · Top brands · Expert stores
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
        <div className="text-center mb-10 max-w-xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-ev-text">Trending right now</h2>
        </div>
        {loading ? (
          <div className="flex justify-center py-16 text-ev-muted gap-2">
            <Loader2 className="animate-spin text-ev-primary" size={24} /> Loading products…
          </div>
        ) : featured.length === 0 ? null : (
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
          <Link href="/shop" className="ev-btn-primary inline-flex items-center justify-center gap-2 text-base py-3 px-8">
            View all products <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      <section className="py-16 sm:py-20 px-4 sm:px-6 max-w-6xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-12 sm:mb-14">
          <p className="text-ev-primary font-bold text-[11px] sm:text-xs uppercase tracking-[0.22em] mb-3">
            How the product actually works
          </p>
          <h2 className="text-2xl sm:text-3xl font-bold text-ev-text tracking-tight mb-4">Why {publicBrandName}?</h2>
          <p className="text-ev-muted text-sm sm:text-base leading-relaxed">
            The marketplace is built around real checkout, orders, and fulfilment—not placeholder screens. Below is what
            you can rely on in the live storefront today.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {(
            [
              {
                kicker: 'Sellers',
                Icon: Store,
                title: 'Shops are vetted before they sell',
                body: 'Partner stores go through onboarding and approval. When a listing is live, the shop name on the product is the same shop that fulfils your line item.',
              },
              {
                kicker: 'Checkout',
                Icon: Layers,
                title: 'One payment, multiple sellers',
                body: 'Your bag can include gear from more than one approved shop where the catalogue allows it. You pay once at checkout; **My orders** keeps per-shop splits readable afterward.',
              },
              {
                kicker: 'Fulfilment',
                Icon: Truck,
                title: 'Tracking shows up on the order',
                body: 'When a shop books dispatch, AWB and carrier details are written back to **My orders**—open the carrier link from there instead of digging through SMS threads.',
              },
              {
                kicker: 'Service',
                Icon: Wrench,
                title: 'Technicians tied to what you bought',
                body: 'After delivery, book install or help from the same account flows linked to your purchase—so context (model, shop, delivery) stays with the request.',
              },
              {
                kicker: 'Payments',
                Icon: CreditCard,
                title: 'Razorpay at checkout',
                body: 'UPI, cards, and netbanking run through Razorpay on the web checkout you already know. We do not route you to random IDs or off-platform payment links.',
              },
              {
                kicker: 'B2B',
                Icon: Receipt,
                title: 'Dealer pricing in the same login',
                body: 'Register with a GSTIN to unlock dealer columns where shops publish them. GST tax invoices you can use for ITC show up under **Dealer hub** when the shop issues them.',
              },
            ] as const
          ).map(({ kicker, Icon, title, body }) => (
            <article
              key={title}
              className="group relative flex flex-col rounded-2xl border border-ev-border bg-ev-surface p-5 sm:p-6 shadow-[0_1px_0_rgba(0,0,0,0.04)] transition-all duration-300 hover:border-ev-primary/30 hover:shadow-ev-md"
            >
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-ev-primary/12 to-ev-primary/5 ring-1 ring-ev-primary/15 group-hover:from-ev-primary/18 group-hover:to-ev-primary/8 transition-colors">
                  <Icon className="text-ev-primary" size={22} strokeWidth={2} />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-ev-subtle tabular-nums">{kicker}</span>
              </div>
              <h3 className="text-base sm:text-[1.05rem] font-bold text-ev-text leading-snug mb-2">{title}</h3>
              <p className="text-ev-muted text-sm leading-relaxed mt-auto">
                {body.split('**').map((part, i) =>
                  i % 2 === 1 ? (
                    <strong key={i} className="font-semibold text-ev-text">
                      {part}
                    </strong>
                  ) : (
                    <span key={i}>{part}</span>
                  ),
                )}
              </p>
            </article>
          ))}
        </div>
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
