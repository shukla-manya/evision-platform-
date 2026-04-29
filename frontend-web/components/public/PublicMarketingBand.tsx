import Link from 'next/link';
import { aboutBrandSummary } from '@/lib/about-company-content';
import { siteQuickLinks } from '@/lib/site-quick-links';
import {
  publicMarketingEmail,
  publicRegisteredAddress,
  publicSalesPhone,
  publicSupportEmail,
  publicSupportPhone,
} from '@/lib/public-contact';

type PublicMarketingBandProps = {
  /** Element id for `aria-labelledby` on the section. */
  headingId?: string;
};

export function PublicMarketingBand({ headingId = 'public-marketing-band' }: PublicMarketingBandProps) {
  return (
    <section className="mt-12 border-t border-ev-border bg-ev-surface2/30 py-10 sm:py-12" aria-labelledby={headingId}>
      <div className="ev-container">
        <p id={headingId} className="mx-auto max-w-3xl text-center text-sm leading-relaxed text-ev-muted sm:text-base">
          {aboutBrandSummary}
        </p>
        <div className="mt-10 grid gap-10 md:grid-cols-2">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-ev-text">Quick Links</h2>
            <ul className="mt-4 space-y-2 text-sm">
              {siteQuickLinks.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="text-ev-muted transition-colors hover:text-ev-primary">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-ev-text">Contact Information</h2>
            <ul className="mt-4 space-y-2 text-sm text-ev-muted">
              <li>
                <a href={`tel:${publicSalesPhone.replace(/\s/g, '')}`} className="hover:text-ev-primary">
                  {publicSalesPhone}
                </a>
              </li>
              <li>
                <a href={`tel:${publicSupportPhone.replace(/\s/g, '')}`} className="hover:text-ev-primary">
                  {publicSupportPhone}
                </a>
              </li>
              <li>
                <a href={`mailto:${publicMarketingEmail}`} className="hover:text-ev-primary">
                  {publicMarketingEmail}
                </a>
              </li>
              <li>
                <a href={`mailto:${publicSupportEmail}`} className="hover:text-ev-primary">
                  {publicSupportEmail}
                </a>
              </li>
              <li className="pt-1 leading-relaxed">{publicRegisteredAddress}</li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
