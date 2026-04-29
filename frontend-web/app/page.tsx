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
  Star,
  Store,
  Truck,
  Wrench,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { cartApi, catalogApi } from '@/lib/api';
import { PublicShell } from '@/components/public/PublicShell';
import { publicBrandName } from '@/lib/public-brand';
import {
  publicMarketingEmail,
  publicRegisteredAddress,
  publicSalesPhone,
  publicSupportEmail,
  publicSupportPhone,
} from '@/lib/public-contact';
import { getRole } from '@/lib/auth';
import { isInWishlist, toggleWishlistId } from '@/lib/wishlist';
import {
  businessSegments,
  customerReviews,
  heroPromoCards,
  showcaseCombos,
  showcasePrimary,
  type StaticShowcaseProduct,
} from '@/lib/home-cctv-content';

type Product = {
  id: string;
  name: string;
  price_customer?: number;
  images?: string[];
  shop_name?: string | null;
  stock?: number;
};

function formatInr(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
}

function StarRow({ rating }: { rating: number }) {
  const full = Math.floor(rating);
  const partial = rating - full >= 0.5;
  return (
    <div className="flex items-center gap-0.5 text-amber-500" aria-label={`Rated ${rating} out of 5`}>
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          size={14}
          className={
            i < full ? 'fill-amber-400 text-amber-500' : i === full && partial ? 'fill-amber-400/60 text-amber-500' : 'fill-none text-ev-border'
          }
          aria-hidden
        />
      ))}
      <span className="text-ev-muted text-xs ml-1 tabular-nums">{rating.toFixed(2)} out of 5</span>
    </div>
  );
}

function StaticProductCard({ p, canBuy }: { p: StaticShowcaseProduct; canBuy: boolean }) {
  const shopHref = `/shop?search=${encodeURIComponent(p.searchQuery)}`;
  return (
    <article className="ev-card overflow-hidden flex flex-col relative">
      {p.hot ? (
        <span className="absolute top-3 left-3 z-10 text-[10px] font-bold uppercase tracking-wide bg-ev-primary text-white px-2 py-0.5 rounded">
          Hot
        </span>
      ) : null}
      <Link href={shopHref} className="relative aspect-[4/3] bg-gradient-to-br from-ev-surface2 to-ev-surface border-b border-ev-border block">
        <div className="absolute inset-0 flex items-center justify-center text-ev-muted/40 text-4xl font-light select-none">◉</div>
      </Link>
      <div className="p-4 sm:p-5 flex-1 flex flex-col">
        <p className="text-ev-subtle text-[11px] uppercase tracking-wide mb-1 line-clamp-2">{p.categoryLine}</p>
        <Link href={shopHref} className="text-ev-text font-semibold text-base hover:text-ev-primary transition-colors line-clamp-2">
          {p.name}
        </Link>
        <div className="mt-2">
          <StarRow rating={p.rating} />
        </div>
        <p className="text-ev-muted text-xs mt-2">{p.inStock ? 'In stock' : 'Out of stock'}</p>
        <p className="text-xl font-bold text-ev-text mt-2">{formatInr(p.priceInr)}</p>
        <div className="mt-auto pt-4">
          {p.inStock ? (
            canBuy ? (
              <Link href={shopHref} className="ev-btn-primary w-full text-sm py-2.5 text-center inline-flex items-center justify-center gap-1.5">
                <Plus size={16} aria-hidden /> Add to cart
              </Link>
            ) : (
              <Link href="/login" className="ev-btn-primary w-full text-sm py-2.5 text-center">
                Sign in to buy
              </Link>
            )
          ) : (
            <Link href={shopHref} className="ev-btn-secondary w-full text-sm py-2.5 text-center">
              Read more
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}

function HomeLeadForm() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const subject = encodeURIComponent(`Website inquiry — ${firstName} ${lastName}`.trim());
    const body = encodeURIComponent(
      `Name: ${firstName} ${lastName}\nEmail: ${email}\n\nMessage:\n${message}`,
    );
    window.location.href = `mailto:${publicSupportEmail}?subject=${subject}&body=${body}`;
  }

  return (
    <form onSubmit={submit} className="ev-card p-6 sm:p-8 space-y-4 max-w-xl mx-auto">
      <h2 className="text-xl font-bold text-ev-text text-center sm:text-left">Secure Your Space with EVISION CCTV Camera</h2>
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className="ev-label" htmlFor="home-fn">
            First name
          </label>
          <input id="home-fn" className="ev-input" value={firstName} onChange={(e) => setFirstName(e.target.value)} autoComplete="given-name" />
        </div>
        <div>
          <label className="ev-label" htmlFor="home-ln">
            Last name
          </label>
          <input id="home-ln" className="ev-input" value={lastName} onChange={(e) => setLastName(e.target.value)} autoComplete="family-name" />
        </div>
      </div>
      <div>
        <label className="ev-label" htmlFor="home-em">
          Email
        </label>
        <input id="home-em" type="email" className="ev-input" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
      </div>
      <div>
        <label className="ev-label" htmlFor="home-msg">
          Your message
        </label>
        <textarea id="home-msg" className="ev-input min-h-[120px] py-3 resize-y" value={message} onChange={(e) => setMessage(e.target.value)} />
      </div>
      <button type="submit" className="ev-btn-primary w-full sm:w-auto">
        Submit
      </button>
      <p className="text-ev-muted text-xs">
        Opens your email app to send to <span className="text-ev-text font-medium">{publicSupportEmail}</span>. Or{' '}
        <Link href="/contact" className="text-ev-primary font-medium hover:underline">
          contact page
        </Link>
        .
      </p>
    </form>
  );
}

export default function HomePage() {
  const [featured, setFeatured] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const role = typeof window !== 'undefined' ? getRole() : undefined;
  const canBuy = role === 'customer' || role === 'dealer';

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const prodRes = await catalogApi.getProducts({ approved_shops_only: true });
        if (cancelled) return;
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

  return (
    <PublicShell>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-ev-primary focus:px-4 focus:py-2 focus:text-white focus:shadow-lg"
      >
        Skip to main content
      </a>
      <a
        href="#site-navigation"
        className="sr-only focus:not-sr-only focus:absolute focus:left-40 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-ev-primary focus:px-4 focus:py-2 focus:text-white focus:shadow-lg"
      >
        Skip to navigation
      </a>

      <main id="main-content" className="min-w-0">
        {/* Trust strip */}
        <section className="border-b border-ev-border bg-ev-surface">
          <div className="ev-container py-3 flex flex-col sm:flex-row flex-wrap items-center justify-center gap-4 sm:gap-10 text-sm text-ev-text">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-ev-primary">24/7 Support</span>
              <a href={`tel:${publicSupportPhone.replace(/\s/g, '')}`} className="text-ev-muted hover:text-ev-primary">
                {publicSupportPhone}
              </a>
            </div>
            <div className="hidden sm:block h-4 w-px bg-ev-border" aria-hidden />
            <div className="flex items-center gap-2 text-ev-muted">
              <Truck size={18} className="text-ev-primary shrink-0" aria-hidden />
              <span>
                <strong className="text-ev-text">Free Shipping</strong> — All over India
              </span>
            </div>
          </div>
        </section>

        {/* Hero promos */}
        <section className="relative overflow-hidden border-b border-ev-border">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-10 right-1/4 w-72 h-72 bg-ev-primary/8 rounded-full blur-3xl" />
          </div>
          <div className="ev-container py-10 sm:py-14 relative">
            <p className="text-center text-ev-primary font-semibold text-xs uppercase tracking-[0.2em] mb-6">All-new and loveable.</p>
            <div className="grid md:grid-cols-3 gap-4 lg:gap-6">
              {heroPromoCards.map((card) => (
                <Link
                  key={card.title}
                  href={card.href}
                  className={`group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br ${card.artClass} p-6 sm:p-8 text-white shadow-ev-md hover:shadow-xl transition-shadow min-h-[200px] flex flex-col`}
                >
                  <h1 className="text-xl sm:text-2xl font-bold leading-tight pr-16">{card.title}</h1>
                  <p className="text-white/80 text-sm mt-2 flex-1">{card.subtitle}</p>
                  <span className="mt-6 inline-flex items-center gap-2 text-sm font-bold bg-white/15 group-hover:bg-white/25 px-4 py-2 rounded-xl w-fit border border-white/20">
                    {card.cta} <ArrowRight size={16} aria-hidden />
                  </span>
                </Link>
              ))}
            </div>
            <div className="flex justify-center mt-8">
              <Link href="/shop" className="ev-btn-primary inline-flex items-center gap-2 text-base py-3 px-8">
                Search products <ArrowRight size={18} aria-hidden />
              </Link>
            </div>
          </div>
        </section>

        {/* Business segments */}
        <section className="bg-gradient-to-b from-[#eef2f6] to-ev-bg py-10 sm:py-12 border-b border-ev-border">
          <div className="ev-container">
            <h2 className="text-xl sm:text-2xl font-bold text-ev-text text-center mb-8">Business</h2>
            <div className="flex flex-wrap justify-center gap-3 sm:gap-4">
              {businessSegments.map((b) => (
                <Link
                  key={b.label}
                  href={b.href}
                  className="px-5 py-2.5 rounded-full border border-ev-border bg-ev-surface text-ev-text text-sm font-semibold hover:border-ev-primary hover:text-ev-primary transition-colors shadow-ev-sm"
                >
                  {b.label}
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* What we provide */}
        <section className="ev-container py-12 sm:py-16 max-w-4xl">
          <h2 className="text-2xl sm:text-3xl font-bold text-ev-text text-center mb-6">What We Provide to Our Customers?</h2>
          <div className="text-ev-muted text-sm sm:text-base leading-relaxed space-y-4 text-center sm:text-left">
            <p>
              We as E-Vision India are proud of providing customized security solutions meant to meet the unique requirements of each
              client. With lot of expertise and dedication, we have specialist knowledge on how dependable security system can be
              conceptualized. These highly experienced consultants are there to guide you through an individualized selection process
              so that you end up with a security solution that best suits your home, business or public place.
            </p>
            <p>
              The coverage of our security arrangement is therefore designed specifically for your peace of mind in which they secure
              all what it is important to protect. Find out today how E-vision India can improve your safety by responding to our
              inquiry form.
            </p>
          </div>
        </section>

        {/* Showcase grid */}
        <section className="border-y border-ev-border bg-ev-surface2/40 py-12 sm:py-16">
          <div className="ev-container">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
              <div>
                <h2 className="text-2xl sm:text-3xl font-bold text-ev-text">Advanced CCTV Surveillance Solutions</h2>
                <p className="text-ev-muted text-sm mt-2 max-w-2xl">Rated lines and indicative pricing — open the shop to match live catalogue and stock.</p>
              </div>
              <Link href="/shop" className="ev-btn-secondary text-sm py-2.5 px-5 self-start shrink-0">
                More products
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {showcasePrimary.map((p) => (
                <StaticProductCard key={p.name} p={p} canBuy={canBuy} />
              ))}
            </div>
          </div>
        </section>

        {/* Combos + collection copy */}
        <section className="ev-container py-12 sm:py-16">
          <div className="max-w-3xl mx-auto text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold text-ev-text mb-4">Security Camera Collection</h2>
            <p className="text-ev-muted text-sm sm:text-base leading-relaxed">
              Discover high-performance Evision surveillance cameras and recording systems engineered for clear visuals, smart monitoring,
              and long-lasting security protection for residential and commercial properties.
            </p>
            <Link href="/shop" className="ev-btn-primary inline-flex items-center gap-2 mt-6 text-sm py-2.5 px-6">
              More combos <ArrowRight size={16} aria-hidden />
            </Link>
          </div>
          <div className="grid sm:grid-cols-3 gap-5 max-w-5xl mx-auto">
            {showcaseCombos.map((p) => (
              <StaticProductCard key={p.name} p={p} canBuy={canBuy} />
            ))}
          </div>
        </section>

        {/* Custom quote */}
        <section className="bg-gradient-to-r from-ev-primary/10 via-ev-bg to-ev-accent/10 py-12 sm:py-16 border-y border-ev-border">
          <div className="ev-container text-center max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold text-ev-text mb-3">Customized Security Solutions</h2>
            <p className="text-ev-muted mb-6">Get CCTV systems designed specifically for your home or business security needs.</p>
            <Link href="/contact" className="ev-btn-primary inline-flex items-center gap-2">
              Get a Custom Quote <ArrowRight size={16} aria-hidden />
            </Link>
          </div>
        </section>

        {/* Innovation */}
        <section className="ev-container py-10 sm:py-12 text-center max-w-3xl mx-auto">
          <h2 className="text-lg sm:text-xl font-bold text-ev-text">Standing at the Forefront of Innovation</h2>
          <p className="text-ev-muted text-sm sm:text-base mt-3 leading-relaxed">
            As we explore new technology, we push the capabilities of what is possible, driving progress through continuous innovation.
          </p>
        </section>

        {/* Live catalogue */}
        <section className="border-t border-ev-border bg-ev-surface py-12 sm:py-16" id="live-catalogue">
          <div className="ev-container">
            <h2 className="text-2xl md:text-3xl font-bold text-ev-text text-center mb-2">Live from our partner shops</h2>
            <p className="text-ev-muted text-sm text-center max-w-xl mx-auto mb-10">
              Real listings from approved stores on {publicBrandName}. Same cart, checkout, and order tracking as the rest of the site.
            </p>
            {loading ? (
              <div className="flex justify-center py-16 text-ev-muted gap-2">
                <Loader2 className="animate-spin text-ev-primary" size={24} aria-hidden /> Loading products…
              </div>
            ) : featured.length === 0 ? (
              <p className="text-center text-ev-muted py-12">
                No products yet — <Link href="/shop" className="text-ev-primary font-medium hover:underline">open the shop</Link>.
              </p>
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
                              <Plus size={16} aria-hidden /> Add to cart
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
              <Link href="/shop" className="ev-btn-secondary inline-flex items-center gap-2 text-sm py-2.5 px-6">
                See all in shop <ArrowRight size={16} aria-hidden />
              </Link>
            </div>
          </div>
        </section>

        {/* Reviews */}
        <section className="ev-container py-12 sm:py-16 border-t border-ev-border">
          <h2 className="text-2xl sm:text-3xl font-bold text-ev-text text-center mb-2">Customer Review</h2>
          <p className="text-ev-muted text-center text-sm mb-10">What our customers say about us?</p>
          <div className="grid md:grid-cols-2 gap-5 max-w-5xl mx-auto">
            {customerReviews.map((r) => (
              <blockquote key={r.name} className="ev-card p-5 sm:p-6 border-ev-border">
                <p className="text-ev-text text-sm leading-relaxed">&ldquo;{r.quote}&rdquo;</p>
                <footer className="mt-4 text-sm font-semibold text-ev-primary">
                  {r.name} — <span className="text-ev-muted font-normal">{r.role}</span>
                </footer>
              </blockquote>
            ))}
          </div>
        </section>

        {/* Lead form */}
        <section className="bg-ev-surface2/50 py-12 sm:py-16 border-t border-ev-border">
          <div className="ev-container">
            <HomeLeadForm />
          </div>
        </section>

        {/* Partner strip + brand line */}
        <section className="ev-container py-10 sm:py-14 border-t border-ev-border">
          <p className="text-center text-ev-muted text-xs uppercase tracking-widest mb-6">Trusted by teams across India</p>
          <div className="flex flex-wrap justify-center gap-6 sm:gap-10 opacity-50 grayscale" aria-label="Partner logos">
            {['client-6', 'client-7', 'client-9', 'client-10', 'client-11'].map((id) => (
              <div
                key={id}
                className="h-12 w-28 rounded-lg bg-ev-border/80 border border-ev-border flex items-center justify-center text-[10px] font-mono text-ev-muted"
              >
                {id}
              </div>
            ))}
          </div>
          <p className="text-center text-ev-muted text-sm max-w-3xl mx-auto mt-10 leading-relaxed">
            EVISION is a surveillance solutions brand delivering high-performance CCTV systems and advanced network infrastructure,
            including PoE and AI-based technologies for reliable security across homes, businesses, and large-scale projects.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row flex-wrap justify-center gap-4 text-sm text-ev-muted text-center">
            <a href={`tel:${publicSalesPhone.replace(/\s/g, '')}`} className="hover:text-ev-primary">
              {publicSalesPhone}
            </a>
            <span className="hidden sm:inline" aria-hidden>
              ·
            </span>
            <a href={`tel:${publicSupportPhone.replace(/\s/g, '')}`} className="hover:text-ev-primary">
              {publicSupportPhone}
            </a>
            <span className="hidden sm:inline" aria-hidden>
              ·
            </span>
            <a href={`mailto:${publicMarketingEmail}`} className="hover:text-ev-primary">
              {publicMarketingEmail}
            </a>
            <span className="hidden sm:inline" aria-hidden>
              ·
            </span>
            <a href={`mailto:${publicSupportEmail}`} className="hover:text-ev-primary">
              {publicSupportEmail}
            </a>
          </div>
          <p className="text-center text-ev-muted text-xs mt-4">{publicRegisteredAddress}</p>
        </section>

        {/* Platform features (unchanged value) */}
        <section className="py-16 sm:py-20 px-4 sm:px-6 max-w-6xl mx-auto border-t border-ev-border">
          <div className="text-center max-w-2xl mx-auto mb-12 sm:mb-14">
            <p className="text-ev-primary font-bold text-[11px] sm:text-xs uppercase tracking-[0.22em] mb-3">How this site works</p>
            <h2 className="text-2xl sm:text-3xl font-bold text-ev-text tracking-tight mb-4">Why {publicBrandName}?</h2>
            <p className="text-ev-muted text-sm sm:text-base leading-relaxed">
              The marketplace is built around real checkout, orders, and fulfilment. Below is what you can rely on today.
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
                  body: 'Your bag can include items from more than one approved shop. You pay once at checkout; **My orders** keeps per-shop splits readable afterward.',
                },
                {
                  kicker: 'Fulfilment',
                  Icon: Truck,
                  title: 'Tracking shows up on the order',
                  body: 'When a shop books dispatch, AWB and carrier details are written back to **My orders**.',
                },
                {
                  kicker: 'Service',
                  Icon: Wrench,
                  title: 'Technicians tied to what you bought',
                  body: 'After delivery, book install or help from the same account flows linked to your purchase.',
                },
                {
                  kicker: 'Payments',
                  Icon: CreditCard,
                  title: 'PayU at checkout',
                  body: 'UPI, cards, and netbanking run through PayU on the hosted checkout you already know.',
                },
                {
                  kicker: 'B2B',
                  Icon: Receipt,
                  title: 'Dealer pricing in the same login',
                  body: 'Register with a GSTIN to unlock dealer columns where shops publish them.',
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

        {/* Dealer / technician */}
        <section className="px-4 sm:px-6 pb-16 max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="ev-card p-8 md:p-10 border-ev-primary/20 bg-gradient-to-br from-ev-surface to-ev-primary/5">
            <Sparkles className="text-ev-primary mb-3" size={22} aria-hidden />
            <h2 className="text-xl md:text-2xl font-bold text-ev-text mb-2">Are you a dealer or distributor?</h2>
            <p className="text-ev-muted text-sm md:text-base mb-6">
              Get exclusive wholesale pricing, GST invoices, and bulk order support. Register your business and unlock dealer prices today.
            </p>
            <Link href="/register?role=dealer" className="ev-btn-primary inline-flex items-center gap-2">
              Register as Dealer <ArrowRight size={16} aria-hidden />
            </Link>
          </div>
          <div className="ev-card p-8 md:p-10 border-ev-border">
            <Clock className="text-ev-primary mb-3" size={22} aria-hidden />
            <h2 className="text-xl md:text-2xl font-bold text-ev-text mb-2">Are you a technician?</h2>
            <p className="text-ev-muted text-sm md:text-base mb-6">
              Join our technician network. Get job requests from verified customers in your area. Flexible hours, real earnings.
            </p>
            <Link href="/technician/register" className="ev-btn-secondary inline-flex items-center gap-2">
              Join as Technician <ArrowRight size={16} aria-hidden />
            </Link>
          </div>
        </section>
      </main>
    </PublicShell>
  );
}
