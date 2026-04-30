import { aboutBrandSummary } from '@/lib/about-company-content';

type PublicMarketingBandProps = {
  /** Element id for `aria-labelledby` on the section. */
  headingId?: string;
};

/** Closing brand line for shop/marketing pages — site-wide links live in the footer only. */
export function PublicMarketingBand({ headingId = 'public-marketing-band' }: PublicMarketingBandProps) {
  return (
    <section className="mt-12 border-t border-ev-border bg-ev-surface2/30 py-10 sm:py-12" aria-labelledby={headingId}>
      <div className="ev-container">
        <p id={headingId} className="mx-auto max-w-3xl text-center text-sm leading-relaxed text-ev-muted sm:text-base">
          {aboutBrandSummary}
        </p>
      </div>
    </section>
  );
}
