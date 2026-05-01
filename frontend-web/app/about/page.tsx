import type { Metadata } from 'next';
import { Home, LayoutGrid, Shield, Truck, Video } from 'lucide-react';
import { PublicShell } from '@/components/public/PublicShell';
import { publicBrandName } from '@/lib/public-brand';
import {
  aboutPrimaryVisualAlt,
  aboutPrimaryVisualSrc,
  aboutWhatWeProvideParagraphs,
  aboutWhatWeProvideTitle,
  premierServiceCards,
  premierServicesIntro,
  premierServicesTitle,
} from '@/lib/about-company-content';
export const metadata: Metadata = {
  title: `About us — ${publicBrandName}`,
  description:
    'E-Vision India — electronic security and safety since 2000. CCTV, access control, smart home, consulting, and ISO-minded manufacturing.',
};

const serviceIcons = [LayoutGrid, Home, Shield, Video] as const;

export default function AboutPage() {
  return (
    <PublicShell>
      <a href="#about-main" className="ev-skip-link">
        Skip to main content
      </a>
      <a href="#site-navigation" className="ev-skip-link--nav">
        Skip to navigation
      </a>

      <main id="about-main" className="min-w-0">
        <section className="border-b border-ev-border bg-ev-surface">
          <div className="ev-container py-3 flex flex-col sm:flex-row flex-wrap items-center justify-center gap-4 sm:gap-10 text-sm text-ev-text">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-ev-primary">24/7 Support</span>
              <a href="#site-footer-contact" className="text-ev-muted hover:text-ev-primary">
                Numbers in footer
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

        <section className="ev-container py-10 sm:py-14">
          <p className="text-ev-muted text-sm font-medium uppercase tracking-wide mb-2">Company</p>
          <h1 className="text-3xl sm:text-4xl font-bold text-ev-text mb-8 max-w-3xl">About E-Vision India</h1>

          {/* Left: single image · Right: What we provide (stacks image-first on small screens) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12 items-start w-full">
            <aside className="order-1 w-full max-w-xl md:max-w-none mx-auto md:mx-0 shrink-0" aria-label="Company photograph">
              <div className="relative aspect-video max-h-[min(420px,50vh)] w-full rounded-2xl border border-ev-border bg-ev-surface2 overflow-hidden shadow-ev-sm">
                {/* eslint-disable-next-line @next/next/no-img-element -- remote marketing photography */}
                <img
                  src={aboutPrimaryVisualSrc}
                  alt={aboutPrimaryVisualAlt}
                  className="absolute inset-0 h-full w-full object-cover"
                  loading="lazy"
                  referrerPolicy="no-referrer"
                />
                <div
                  className="absolute inset-0 bg-gradient-to-t from-ev-navbar/25 via-transparent to-transparent pointer-events-none"
                  aria-hidden
                />
              </div>
            </aside>
            <div className="order-2 min-w-0">
              <h2 className="text-2xl font-bold text-ev-text mb-4 text-left">{aboutWhatWeProvideTitle}</h2>
              <div className="text-ev-muted text-sm sm:text-base leading-relaxed space-y-4 text-left">
                {aboutWhatWeProvideParagraphs.map((p) => (
                  <p key={p.slice(0, 40)}>{p}</p>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-ev-border bg-ev-surface2/50 py-12 sm:py-16">
          <div className="ev-container">
            <h2 className="text-2xl sm:text-3xl font-bold text-ev-text text-center mb-4">{premierServicesTitle}</h2>
            <p className="text-ev-muted text-sm sm:text-base leading-relaxed text-center max-w-4xl mx-auto mb-12">
              {premierServicesIntro}
            </p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {premierServiceCards.map((card, i) => {
                const Icon = serviceIcons[i] ?? Shield;
                return (
                  <article key={card.title} className="ev-card p-6 flex flex-col">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-ev-primary/10 text-ev-primary mb-4">
                      <Icon size={24} strokeWidth={2} aria-hidden />
                    </div>
                    <h3 className="text-lg font-bold text-ev-text mb-2">{card.title}</h3>
                    <p className="text-ev-muted text-sm leading-relaxed flex-1">{card.body}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

      </main>
    </PublicShell>
  );
}
