'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Clock,
  CreditCard,
  Heart,
  Layers,
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
import { BrowseBySiteAnimatedSvg } from '@/components/public/BrowseBySiteAnimatedSvg';
import { PublicTrustStrip } from '@/components/public/PublicTrustStrip';
import { publicBrandName } from '@/lib/public-brand';
import { publicSupportEmail } from '@/lib/public-contact';
import { getRole } from '@/lib/auth';
import { isInWishlist, toggleWishlistId } from '@/lib/wishlist';
import {
  businessSegments,
  businessSegmentsSectionTitle,
  homeHeroSlides,
  homeLeadFormImageAlt,
  homeLeadFormImageSrc,
  homePromoStripCards,
  homePromoStripKicker,
  customQuoteSectionBackgroundSrc,
  customQuoteSectionBody,
  customQuoteSectionCta,
  customQuoteSectionTitle,
  homeDealerSectionImageAlt,
  homeDealerSectionImageSrc,
  homeJoinTechnicianSectionImageAlt,
  homeJoinTechnicianSectionImageSrc,
  homeCustomerReviews,
  securityCameraCollectionIntro,
  securityCameraCollectionTitle,
} from '@/lib/home-cctv-content';
import { aboutWhatWeProvideParagraphs, aboutWhatWeProvideTitle } from '@/lib/about-company-content';

type Product = {
  id: string;
  name: string;
  price_customer?: number;
  images?: string[];
  shop_name?: string | null;
  stock?: number;
};

type ShowcaseProduct = Product & {
  category_name?: string | null;
  listing_rating?: number | null;
  showcase_hot?: boolean;
};

/** Max items in “Advanced CCTV Surveillance Solutions” (superadmin Homepage showcase → primary). */
const HOME_SHOWCASE_PRIMARY_MAX = 6;
/** Max items in “Security Camera Collection” row (Homepage showcase → combos). */
const HOME_SHOWCASE_COMBOS_MAX = 2;

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

function HomeShowcaseProductCard({
  p,
  canBuy,
  bumpWishlist,
}: {
  p: ShowcaseProduct;
  canBuy: boolean;
  bumpWishlist?: () => void;
}) {
  const img = p.images?.[0];
  const price = Number(p.price_customer || 0);
  const inStock = Number(p.stock ?? 0) > 0;
  const wished = isInWishlist(p.id);
  const rating = p.listing_rating;
  return (
    <article className="ev-card overflow-hidden flex flex-col relative group">
      {p.showcase_hot ? (
        <span className="absolute top-3 left-3 z-10 text-[10px] font-bold uppercase tracking-wide bg-ev-primary text-white px-2 py-0.5 rounded">
          Hot
        </span>
      ) : null}
      <Link href={`/products/${p.id}`} className="relative aspect-[4/3] bg-gradient-to-br from-ev-surface2 to-ev-surface border-b border-ev-border block">
        {img ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={img} alt="" className="absolute inset-0 w-full h-full object-cover" referrerPolicy="no-referrer" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-ev-muted/40 text-4xl font-light select-none">◉</div>
        )}
        <button
          type="button"
          className="absolute top-3 right-3 w-9 h-9 rounded-full bg-ev-surface/95 border border-ev-border flex items-center justify-center shadow-ev-sm hover:border-ev-primary transition-colors z-10"
          aria-label={wished ? 'Remove from wishlist' : 'Add to wishlist'}
          onClick={(e) => {
            e.preventDefault();
            toggleWishlistId(p.id);
            bumpWishlist?.();
            window.dispatchEvent(new Event('ev-wishlist'));
          }}
        >
          <Heart size={18} className={wished ? 'text-ev-primary fill-ev-primary' : 'text-ev-muted'} />
        </button>
      </Link>
      <div className="p-4 sm:p-5 flex-1 flex flex-col">
        <p className="text-ev-subtle text-[11px] uppercase tracking-wide mb-1 line-clamp-2">
          {p.category_name || p.shop_name || 'Catalogue'}
        </p>
        <Link href={`/products/${p.id}`} className="text-ev-text font-semibold text-base hover:text-ev-primary transition-colors line-clamp-2">
          {p.name}
        </Link>
        {rating != null && !Number.isNaN(Number(rating)) && Number(rating) >= 1 ? (
          <div className="mt-2">
            <StarRow rating={Number(rating)} />
          </div>
        ) : null}
        <p className="text-ev-muted text-xs mt-2">{inStock ? 'In stock' : 'Out of stock'}</p>
        <p className="text-xl font-bold text-ev-text mt-2">{price > 0 ? formatInr(price) : '—'}</p>
        <div className="mt-auto pt-4">
          {inStock ? (
            canBuy ? (
              <button
                type="button"
                className="ev-btn-primary w-full text-sm py-2.5 inline-flex items-center justify-center gap-1.5"
                onClick={async () => {
                  try {
                    await cartApi.addItem(p.id, 1);
                    toast.success('Added to cart');
                  } catch {
                    toast.error('Could not add to cart');
                  }
                }}
              >
                <Plus size={16} aria-hidden /> Add to cart
              </button>
            ) : (
              <Link href="/login" className="ev-btn-primary w-full text-sm py-2.5 text-center block">
                Sign in to buy
              </Link>
            )
          ) : (
            <Link href={`/products/${p.id}`} className="ev-btn-secondary w-full text-sm py-2.5 text-center block">
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
    <div className="grid lg:grid-cols-2 gap-8 lg:gap-10 xl:gap-12 items-stretch max-w-6xl mx-auto w-full">
      <div className="relative min-h-[240px] sm:min-h-[280px] lg:min-h-[320px] rounded-2xl overflow-hidden border border-ev-border bg-ev-surface2 shadow-ev-sm">
        {/* eslint-disable-next-line @next/next/no-img-element -- marketing panel beside lead form */}
        <img
          src={homeLeadFormImageSrc}
          alt={homeLeadFormImageAlt}
          className="absolute inset-0 h-full w-full object-cover"
          loading="lazy"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-ev-navbar/35 via-transparent to-transparent pointer-events-none" aria-hidden />
      </div>
      <form onSubmit={submit} className="ev-card p-6 sm:p-8 space-y-4 flex flex-col justify-center">
        <h2 className="text-xl sm:text-2xl font-bold text-ev-text text-center sm:text-left">
          Secure Your Space with EVISION CCTV Camera
        </h2>
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
    </div>
  );
}

function MarqueeStarStrip({ rating }: { rating: number }) {
  const full = Math.floor(rating);
  const partial = rating - full >= 0.5;
  return (
    <span className="inline-flex shrink-0 items-center gap-0.5 text-amber-500" aria-hidden>
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          size={12}
          className={
            i < full
              ? 'fill-amber-400 text-amber-500'
              : i === full && partial
                ? 'fill-amber-400/60 text-amber-500'
                : 'fill-none text-ev-border'
          }
        />
      ))}
    </span>
  );
}

function HomeTestimonialsMarquee() {
  const [motionReduced, setMotionReduced] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setMotionReduced(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  const segment = (suffix: string) => (
    <div
      className="flex shrink-0 items-center gap-x-8 sm:gap-x-12 md:gap-x-16 pr-8 sm:pr-12 md:pr-16"
      aria-hidden={suffix === 'b'}
    >
      {homeCustomerReviews.map((r, i) => (
        <span
          key={`${suffix}-${i}`}
          className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap text-xs text-ev-text sm:text-sm sm:gap-2"
        >
          <MarqueeStarStrip rating={r.rating} />
          <span className="font-medium">&ldquo;{r.quote}&rdquo;</span>
          <span className="text-ev-muted font-medium">— {r.author}</span>
          <span className="text-ev-subtle hidden sm:inline">· {r.subtitle}</span>
        </span>
      ))}
    </div>
  );

  return (
    <div
      className="ev-home-testimonials-marquee group relative mx-auto flex aspect-square w-full max-w-md flex-col overflow-hidden rounded-2xl border border-ev-border bg-ev-surface shadow-ev-sm"
      role="region"
      aria-label="Customer testimonials, scrolling in a loop inside a square panel"
    >
      <p className="shrink-0 border-b border-ev-border/80 bg-ev-surface2/50 py-2.5 text-center text-[10px] font-bold uppercase tracking-[0.2em] text-ev-primary sm:py-3">
        Customer reviews
      </p>

      <div className="relative flex min-h-0 flex-1 flex-col justify-center">
        <div
          className="pointer-events-none absolute inset-y-0 left-0 z-10 w-8 bg-gradient-to-r from-ev-surface to-transparent sm:w-10"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-y-0 right-0 z-10 w-8 bg-gradient-to-l from-ev-surface to-transparent sm:w-10"
          aria-hidden
        />

        {motionReduced ? (
          <div className="relative z-0 min-h-0 flex-1 overflow-y-auto px-3 py-3 sm:px-4">
            <div className="flex flex-col gap-3 text-center text-xs text-ev-text sm:text-sm">
              {homeCustomerReviews.map((r, i) => (
                <p key={i} className="text-ev-muted">
                  <span className="font-medium text-ev-text">&ldquo;{r.quote}&rdquo;</span>
                  <span className="text-ev-subtle"> — {r.author}</span>
                </p>
              ))}
            </div>
          </div>
        ) : (
          <div className="relative z-0 flex min-h-0 w-full flex-1 items-center overflow-hidden">
            <div className="ev-home-testimonials-marquee__track">
              {segment('a')}
              {segment('b')}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function HomePage() {
  const [showcaseFromApi, setShowcaseFromApi] = useState<{ primary: ShowcaseProduct[]; combos: ShowcaseProduct[] }>({
    primary: [],
    combos: [],
  });
  const [, setWishBump] = useState(0);
  const [heroIndex, setHeroIndex] = useState(0);
  const [heroCarouselPaused, setHeroCarouselPaused] = useState(false);
  const heroLiveRef = useRef<HTMLSpanElement>(null);
  const role = typeof window !== 'undefined' ? getRole() : undefined;
  const canBuy = role === 'customer' || role === 'dealer';

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setHeroCarouselPaused(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  useEffect(() => {
    if (heroCarouselPaused) return;
    const n = homeHeroSlides.length;
    if (n <= 1) return;
    const id = window.setInterval(() => {
      setHeroIndex((i) => (i + 1) % n);
    }, 3000);
    return () => window.clearInterval(id);
  }, [heroCarouselPaused]);

  useEffect(() => {
    const el = heroLiveRef.current;
    if (!el) return;
    el.textContent = `Slide ${heroIndex + 1} of ${homeHeroSlides.length}: ${homeHeroSlides[heroIndex].title}. ${homeHeroSlides[heroIndex].subtitle}`;
  }, [heroIndex]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const homeRes = await catalogApi.getHomeShowcase().catch(() => ({ data: { primary: [], combos: [] } }));
        if (cancelled) return;
        const raw = homeRes.data as { primary?: unknown[]; combos?: unknown[] };
        const primary = Array.isArray(raw?.primary) ? (raw.primary as ShowcaseProduct[]) : [];
        const combos = Array.isArray(raw?.combos) ? (raw.combos as ShowcaseProduct[]) : [];
        setShowcaseFromApi({ primary, combos });
      } catch {
        if (!cancelled) toast.error('Could not load homepage showcase');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <PublicShell>
      <a href="#main-content" className="ev-skip-link">
        Skip to main content
      </a>
      <a href="#site-navigation" className="ev-skip-link--nav">
        Skip to navigation
      </a>

      <main id="main-content" className="min-w-0">
        <PublicTrustStrip />

        {/* Hero carousel — full-width imagery, 3s per slide */}
        <section
          className="relative border-b border-ev-border overflow-hidden bg-ev-text"
          aria-roledescription="carousel"
          aria-label="Featured security products"
        >
          <span ref={heroLiveRef} className="sr-only" aria-live="polite" />
          <div className="relative min-h-[280px] sm:min-h-[340px] md:min-h-[420px] w-full">
            {homeHeroSlides.map((slide, i) => (
              <Link
                key={slide.title}
                href={slide.href}
                className={`absolute inset-0 flex flex-col justify-end transition-opacity duration-700 ease-in-out outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-ev-text ${
                  i === heroIndex ? 'opacity-100 z-[2] pointer-events-auto' : 'opacity-0 z-[1] pointer-events-none'
                }`}
                aria-hidden={i !== heroIndex}
                tabIndex={i === heroIndex ? 0 : -1}
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- remote marketing hero URLs */}
                <img
                  src={slide.imageSrc}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover"
                  fetchPriority={i === 0 ? 'high' : 'low'}
                  decoding={i === 0 ? 'sync' : 'async'}
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/45 to-black/25" aria-hidden />
                <div className="relative z-10 ev-container pb-14 sm:pb-16 pt-24 sm:pt-28 text-white">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/85 mb-2">All-new and loveable</p>
                  <h1 className="text-2xl sm:text-4xl md:text-5xl font-bold leading-tight max-w-3xl drop-shadow-sm">
                    {slide.title}
                  </h1>
                  <p className="mt-3 text-sm sm:text-lg text-white/90 max-w-2xl leading-relaxed">{slide.subtitle}</p>
                  <span className="mt-6 inline-flex items-center gap-2 text-sm font-bold bg-white/15 hover:bg-white/25 px-4 py-2.5 rounded-xl border border-white/25 w-fit transition-colors">
                    {slide.cta} <ArrowRight size={16} aria-hidden />
                  </span>
                </div>
              </Link>
            ))}
            <div className="absolute bottom-5 left-0 right-0 z-[3] flex justify-center gap-2 pointer-events-auto">
              {homeHeroSlides.map((slide, i) => (
                <button
                  key={slide.title}
                  type="button"
                  onClick={() => setHeroIndex(i)}
                  className={`h-2.5 rounded-full transition-all pointer-events-auto ${
                    i === heroIndex ? 'w-8 bg-white' : 'w-2.5 bg-white/45 hover:bg-white/70'
                  }`}
                  aria-label={`Show slide ${i + 1}: ${slide.title}`}
                  aria-current={i === heroIndex}
                />
              ))}
            </div>
          </div>
          <div className="relative z-[3] flex justify-center py-4 bg-ev-bg/95 backdrop-blur-sm border-t border-white/10">
            <Link href="/shop" className="ev-btn-primary inline-flex items-center gap-2 text-sm sm:text-base py-2.5 sm:py-3 px-6 sm:px-8">
              Search products <ArrowRight size={18} aria-hidden />
            </Link>
          </div>
        </section>

        {/* Image promos — same three lines as hero, “Buy Now”, under carousel */}
        <section className="border-b border-ev-border bg-ev-bg py-8 sm:py-10" aria-labelledby="home-promo-strip-heading">
          <div className="ev-container">
            <p
              id="home-promo-strip-heading"
              className="text-center text-ev-primary font-semibold text-xs uppercase tracking-[0.2em] mb-6"
            >
              {homePromoStripKicker}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 lg:gap-5">
              {homePromoStripCards.map((card) => (
                <Link
                  key={card.title}
                  href={card.href}
                  className="group relative overflow-hidden rounded-2xl border border-ev-border min-h-[200px] sm:min-h-[220px] flex flex-col justify-end p-6 sm:p-7 text-white shadow-ev-md hover:shadow-ev-lg transition-shadow outline-none focus-visible:ring-2 focus-visible:ring-ev-primary focus-visible:ring-offset-2"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- marketing tile backgrounds */}
                  <img
                    src={card.imageSrc}
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                    referrerPolicy="no-referrer"
                  />
                  <div
                    className="absolute inset-0 bg-gradient-to-t from-black/82 via-black/40 to-black/15"
                    aria-hidden
                  />
                  <div className="relative z-10">
                    <p className="text-lg sm:text-xl font-bold leading-snug drop-shadow-sm">{card.title}</p>
                    <span className="mt-4 inline-flex items-center gap-2 text-sm font-bold bg-white/20 group-hover:bg-white/30 px-4 py-2 rounded-xl border border-white/25 w-fit transition-colors">
                      {card.cta} <ArrowRight size={16} aria-hidden />
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Install-type shortcuts */}
        <section className="bg-gradient-to-b from-[#eef2f6] to-ev-bg py-10 sm:py-12 border-b border-ev-border">
          <div className="ev-container">
            <h2 className="text-xl sm:text-2xl font-bold text-ev-text text-center mb-5">{businessSegmentsSectionTitle}</h2>
            <BrowseBySiteAnimatedSvg className="mb-7" />
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

        {/* What we provide — same copy as /about */}
        <section className="py-12 sm:py-16">
          <div className="ev-container max-w-4xl">
            <h2 className="text-2xl sm:text-3xl font-bold text-ev-text text-center mb-6">{aboutWhatWeProvideTitle}</h2>
            <div className="text-ev-muted text-sm sm:text-base leading-relaxed space-y-4 text-center sm:text-left">
              {aboutWhatWeProvideParagraphs.map((p) => (
                <p key={p.slice(0, 48)}>{p}</p>
              ))}
            </div>
            <div className="flex justify-center mt-8">
              <Link
                href="/about"
                className="ev-btn-primary inline-flex items-center gap-2 text-sm py-2.5 px-6"
              >
                Full company story, services & certificates <ArrowRight size={16} aria-hidden />
              </Link>
            </div>
          </div>
        </section>

        {/* Showcase grid — superadmin only (Homepage showcase → Advanced CCTV); no static fallback */}
        <section className="border-y border-ev-border bg-ev-surface2/40 py-12 sm:py-16">
          <div className="ev-container">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
              <div>
                <h2 className="text-2xl sm:text-3xl font-bold text-ev-text">Advanced CCTV Surveillance Solutions</h2>
                <p className="text-ev-muted text-sm mt-2 max-w-2xl">
                  {showcaseFromApi.primary.length > 0
                    ? `Up to ${HOME_SHOWCASE_PRIMARY_MAX} live catalogue picks chosen in superadmin (Homepage showcase → Advanced CCTV). Prices and stock match the shop.`
                    : 'This grid shows only products superadmin marks for the homepage (Homepage showcase → Advanced CCTV). None are set yet — browse the shop for everything in stock.'}
                </p>
              </div>
              <Link href="/shop" className="ev-btn-secondary text-sm py-2.5 px-5 self-start shrink-0">
                More products
              </Link>
            </div>
            {showcaseFromApi.primary.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {showcaseFromApi.primary.slice(0, HOME_SHOWCASE_PRIMARY_MAX).map((p) => (
                  <HomeShowcaseProductCard
                    key={p.id}
                    p={p}
                    canBuy={canBuy}
                    bumpWishlist={() => setWishBump((n) => n + 1)}
                  />
                ))}
              </div>
            ) : (
              <p className="text-ev-muted text-sm rounded-lg border border-dashed border-ev-border bg-ev-surface px-4 py-6 text-center max-w-xl mx-auto">
                No homepage showcase products yet. In superadmin, edit a platform catalogue product and set Homepage showcase to{' '}
                <span className="text-ev-text font-medium">Advanced CCTV</span> (and order). Up to {HOME_SHOWCASE_PRIMARY_MAX}{' '}
                appear here.
              </p>
            )}
          </div>
        </section>

        {/* Combos — copy + CTA left, two products right */}
        <section className="ev-container py-12 sm:py-16 border-b border-ev-border">
          <div className="flex flex-col lg:flex-row lg:items-stretch gap-10 lg:gap-14 xl:gap-16">
            <div className="lg:w-[min(100%,26rem)] xl:max-w-md shrink-0 flex flex-col justify-center text-center lg:text-left">
              <h2 className="text-2xl sm:text-3xl font-bold text-ev-text mb-4">{securityCameraCollectionTitle}</h2>
              <p className="text-ev-muted text-sm sm:text-base leading-relaxed">{securityCameraCollectionIntro}</p>
              <Link
                href="/shop"
                className="ev-btn-primary inline-flex items-center gap-2 mt-6 lg:mt-8 text-sm py-2.5 px-6 self-center lg:self-start"
              >
                More combos <ArrowRight size={16} aria-hidden />
              </Link>
            </div>
            <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-2 gap-5">
              {showcaseFromApi.combos.length > 0 ? (
                showcaseFromApi.combos.slice(0, HOME_SHOWCASE_COMBOS_MAX).map((p) => (
                  <HomeShowcaseProductCard
                    key={p.id}
                    p={p}
                    canBuy={canBuy}
                    bumpWishlist={() => setWishBump((n) => n + 1)}
                  />
                ))
              ) : (
                <p className="text-ev-muted text-sm rounded-lg border border-dashed border-ev-border bg-ev-surface px-4 py-6 text-center sm:col-span-2">
                  No combo picks on the homepage yet. In superadmin, set Homepage showcase to{' '}
                  <span className="text-ev-text font-medium">Combos</span> on up to {HOME_SHOWCASE_COMBOS_MAX} products.
                </p>
              )}
            </div>
          </div>
        </section>

        {/* Platform features — above custom quote */}
        <section className="py-16 sm:py-20 border-t border-ev-border">
          <div className="ev-container">
            <div className="text-center max-w-2xl mx-auto w-full mb-12 sm:mb-14">
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
          </div>
        </section>

        {/* Custom quote — surveillance image + slow motion, copy on top */}
        <section className="relative overflow-hidden border-y border-ev-border min-h-[260px] sm:min-h-[300px] md:min-h-[340px] flex items-center">
          <div className="pointer-events-none absolute inset-0" aria-hidden>
            {/* eslint-disable-next-line @next/next/no-img-element -- full-bleed marketing background */}
            <img
              src={customQuoteSectionBackgroundSrc}
              alt=""
              className="ev-custom-quote-bg__img absolute max-w-none"
              referrerPolicy="no-referrer"
            />
          </div>
          <div
            className="pointer-events-none absolute inset-0 bg-gradient-to-br from-ev-navbar/92 via-ev-navbar/78 to-ev-primary/35"
            aria-hidden
          />
          <div className="relative z-10 ev-container py-14 sm:py-16 md:py-20 text-center max-w-2xl mx-auto w-full">
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3 drop-shadow-sm">{customQuoteSectionTitle}</h2>
            <p className="text-white/88 text-sm sm:text-base leading-relaxed mb-8 drop-shadow-sm">{customQuoteSectionBody}</p>
            <Link
              href="/contact"
              className="ev-btn-primary inline-flex items-center gap-2 shadow-lg shadow-black/20"
            >
              {customQuoteSectionCta} <ArrowRight size={16} aria-hidden />
            </Link>
          </div>
        </section>

        {/* Lead form */}
        <section className="bg-ev-surface2/50 py-12 sm:py-16 border-t border-ev-border">
          <div className="ev-container">
            <HomeLeadForm />
          </div>
        </section>

        {/* Customer testimonials — square panel, single-line marquee loop */}
        <section className="py-12 sm:py-16 border-t border-ev-border bg-ev-bg" aria-labelledby="home-reviews-heading">
          <div className="ev-container flex flex-col items-center gap-6">
            <h2 id="home-reviews-heading" className="text-xl sm:text-2xl font-bold text-ev-text text-center">
              Loved by customers across India
            </h2>
            <HomeTestimonialsMarquee />
          </div>
        </section>

        {/* Dealer / technician */}
        <section className="ev-container pb-16 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="ev-card overflow-hidden border-ev-primary/20 flex flex-col md:flex-row md:min-h-[min(100%,280px)]">
            <div className="relative w-full md:w-[44%] shrink-0 aspect-[5/4] sm:aspect-[4/3] md:aspect-auto md:min-h-[220px] bg-ev-surface2 border-b md:border-b-0 md:border-r border-ev-border">
              {/* eslint-disable-next-line @next/next/no-img-element -- external marketing CDN */}
              <img
                src={homeDealerSectionImageSrc}
                alt={homeDealerSectionImageAlt}
                className="absolute inset-0 h-full w-full object-cover object-center"
                loading="lazy"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="p-8 md:p-10 flex flex-col justify-center flex-1 min-w-0 bg-gradient-to-br from-ev-surface to-ev-primary/5">
              <Sparkles className="text-ev-primary mb-3" size={22} aria-hidden />
              <h2 className="text-xl md:text-2xl font-bold text-ev-text mb-2">Are you a dealer or distributor?</h2>
              <p className="text-ev-muted text-sm md:text-base mb-6">
                Get exclusive wholesale pricing, GST invoices, and bulk order support. Register your business and unlock dealer prices today.
              </p>
              <Link href="/register?role=dealer" className="ev-btn-primary inline-flex items-center gap-2 w-fit">
                Register as Dealer <ArrowRight size={16} aria-hidden />
              </Link>
            </div>
          </div>
          <div className="ev-card overflow-hidden border-ev-border flex flex-col md:flex-row md:min-h-[min(100%,280px)]">
            <div className="relative w-full md:w-[44%] shrink-0 aspect-[5/4] sm:aspect-[4/3] md:aspect-auto md:min-h-[220px] bg-ev-surface2 border-b md:border-b-0 md:border-r border-ev-border">
              {/* eslint-disable-next-line @next/next/no-img-element -- external marketing CDN */}
              <img
                src={homeJoinTechnicianSectionImageSrc}
                alt={homeJoinTechnicianSectionImageAlt}
                className="absolute inset-0 h-full w-full object-cover object-center"
                loading="lazy"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="p-8 md:p-10 flex flex-col justify-center flex-1 min-w-0">
              <Clock className="text-ev-primary mb-3" size={22} aria-hidden />
              <h2 className="text-xl md:text-2xl font-bold text-ev-text mb-2">Are you a technician?</h2>
              <p className="text-ev-muted text-sm md:text-base mb-6">
                Join our technician network. Get job requests from verified customers in your area. Flexible hours, real earnings.
              </p>
              <Link href="/technician/register" className="ev-btn-secondary inline-flex items-center gap-2 w-fit">
                Join as Technician <ArrowRight size={16} aria-hidden />
              </Link>
            </div>
          </div>
        </section>
      </main>
    </PublicShell>
  );
}
