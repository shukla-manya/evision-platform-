import type { Metadata } from 'next';
import Link from 'next/link';
import { Home, LayoutGrid, Shield, Truck, Video } from 'lucide-react';
import { PublicShell } from '@/components/public/PublicShell';
import { publicBrandName } from '@/lib/public-brand';
import {
  publicMarketingEmail,
  publicRegisteredAddress,
  publicSalesPhone,
  publicSupportEmail,
  publicSupportPhone,
} from '@/lib/public-contact';
import {
  aboutBrandSummary,
  aboutWhatWeProvideParagraphs,
  aboutWhatWeProvideTitle,
  premierServiceCards,
  premierServicesIntro,
  premierServicesTitle,
} from '@/lib/about-company-content';
import { siteQuickLinks } from '@/lib/site-quick-links';
import { TestimonialsMarquee } from '@/components/public/TestimonialsMarquee';

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

        <section className="ev-container py-10 sm:py-14">
          <p className="text-ev-muted text-sm font-medium uppercase tracking-wide mb-2">Company</p>
          <h1 className="text-3xl sm:text-4xl font-bold text-ev-text mb-8 max-w-3xl">About E-Vision India</h1>

          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-start max-w-6xl">
            <div className="space-y-4">
              <div className="relative aspect-[1178/1536] max-h-[min(520px,70vh)] rounded-2xl border border-ev-border bg-gradient-to-br from-ev-surface2 to-ev-surface overflow-hidden">
                <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center text-ev-muted">
                  <span className="text-xs font-semibold uppercase tracking-widest text-ev-subtle">Manufacturing &amp; quality</span>
                  <span className="text-sm mt-2">Image area 1178 × 1536 — replace with your production photo</span>
                </div>
              </div>
              <div className="relative aspect-video rounded-2xl border border-ev-border bg-ev-surface2 flex items-center justify-center text-ev-muted text-sm">
                Secondary visual (e1) — optional hero or process image
              </div>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-ev-text mb-4">{aboutWhatWeProvideTitle}</h2>
              <div className="text-ev-muted text-sm sm:text-base leading-relaxed space-y-4">
                {aboutWhatWeProvideParagraphs.map((p) => (
                  <p key={p.slice(0, 40)}>{p}</p>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-ev-border bg-ev-surface2/50 py-12 sm:py-16">
          <div className="ev-container max-w-6xl">
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

        <section className="ev-container py-12 sm:py-16">
          <h2 className="text-2xl font-bold text-ev-text text-center mb-8">Our Certificates</h2>
          <div className="flex flex-wrap justify-center gap-4 max-w-4xl mx-auto">
            {Array.from({ length: 6 }, (_, i) => (
              <div
                key={i}
                className="h-24 w-28 sm:h-28 sm:w-32 rounded-xl border-2 border-dashed border-ev-border bg-ev-surface2 flex items-center justify-center text-[10px] font-medium text-ev-muted uppercase tracking-wide"
              >
                Cert {i + 1}
              </div>
            ))}
          </div>
        </section>

        <section className="border-t border-ev-border bg-ev-surface py-10 sm:py-14">
          <div className="ev-container">
            <p className="text-center text-ev-muted text-xs uppercase tracking-widest mb-6">Trusted partners</p>
            <div className="flex flex-wrap justify-center gap-6 sm:gap-8 opacity-60 grayscale" aria-label="Client logos">
              {clientIds.map((id) => (
                <div
                  key={id}
                  className="h-12 w-28 rounded-lg bg-ev-border/60 border border-ev-border flex items-center justify-center text-[10px] font-mono text-ev-muted"
                >
                  {id}
                </div>
              ))}
            </div>
            <p className="text-center text-ev-muted text-sm max-w-3xl mx-auto mt-10 leading-relaxed">{aboutBrandSummary}</p>
          </div>
        </section>

        <section className="ev-container py-12 sm:py-16 max-w-5xl">
          <h2 className="text-xl font-bold text-ev-text mb-6 text-center sm:text-left">Quick Links</h2>
          <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
            {siteQuickLinks.map((l) => (
              <Link
                key={l.label}
                href={l.href}
                className="text-sm font-medium px-3 py-1.5 rounded-full border border-ev-border bg-ev-surface text-ev-primary hover:border-ev-primary/40 transition-colors"
              >
                {l.label}
              </Link>
            ))}
          </div>
          <p className="text-ev-subtle text-xs mt-4 text-center sm:text-left">
            Policy pages without a dedicated URL open Contact — we will route you to the right team.
          </p>
        </section>

        <section className="border-t border-ev-border bg-ev-surface2/40 py-12 sm:py-16">
          <div className="ev-container max-w-3xl">
            <h2 className="text-xl font-bold text-ev-text mb-6">Contact Information</h2>
            <ul className="space-y-3 text-ev-muted text-sm sm:text-base">
              <li>
                <a href={`tel:${publicSalesPhone.replace(/\s/g, '')}`} className="text-ev-primary font-semibold hover:underline">
                  {publicSalesPhone}
                </a>
              </li>
              <li>
                <a href={`tel:${publicSupportPhone.replace(/\s/g, '')}`} className="text-ev-primary font-semibold hover:underline">
                  {publicSupportPhone}
                </a>
              </li>
              <li>
                <a href={`mailto:${publicMarketingEmail}`} className="text-ev-primary font-semibold hover:underline">
                  {publicMarketingEmail}
                </a>
              </li>
              <li>
                <a href={`mailto:${publicSupportEmail}`} className="text-ev-primary font-semibold hover:underline">
                  {publicSupportEmail}
                </a>
              </li>
              <li className="pt-2 leading-relaxed">{publicRegisteredAddress}</li>
            </ul>
            <p className="text-ev-subtle text-xs mt-6">Copyright © {new Date().getFullYear()} Evision Powered by Cybrical Tech LLP.</p>
          </div>
        </section>

        <section className="ev-container py-10 pb-16 flex flex-wrap gap-3">
          <Link href="/shop" className="ev-btn-primary text-sm">
            Browse shop
          </Link>
          <Link href="/contact" className="ev-btn-secondary text-sm">
            Contact us
          </Link>
          <Link href="/faq" className="ev-btn-secondary text-sm">
            FAQs
          </Link>
        </section>
      </main>
    </PublicShell>
  );
}
