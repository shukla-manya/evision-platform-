'use client';

import Link from 'next/link';
import { Heart } from 'lucide-react';
import { ELECTRICIAN_SUPPORT_EMAIL } from '@/lib/electrician-ui';
import {
  formatIndianPhoneDisplay,
  publicCompanyLegalName,
  publicInfoEmail,
  publicMarketingEmail,
  publicOfficeMapEmbedUrl,
  publicRegisteredAddress,
  publicSalesPhone,
  publicSupportEmail,
  publicSupportPhone,
  publicTelHref,
} from '@/lib/public-contact';

const year = new Date().getFullYear();

const linkClass =
  'text-[13px] leading-snug text-white/70 hover:text-white transition-colors py-0.5';

const sectionTitle =
  'text-[11px] font-semibold uppercase tracking-[0.14em] text-white/90 mb-3';

/**
 * Technician workspace footer only — matches public site “Registered office & helpdesk”
 * and bottom legal / attribution strip (no shop columns).
 */
export function ElectricianFooter() {
  return (
    <footer className="mt-auto border-t border-ev-border bg-ev-navbar pb-[env(safe-area-inset-bottom)] text-white">
      <div className="ev-page-gutter py-6 sm:py-7">
        <nav
          className="flex flex-wrap gap-x-5 gap-y-2 border-b border-white/10 pb-5 sm:pb-6"
          aria-label="Technician links"
        >
          <a href={`mailto:${ELECTRICIAN_SUPPORT_EMAIL}`} className={linkClass}>
            Email support
          </a>
          <Link href="/support" className={linkClass}>
            Help centre
          </Link>
          <Link href="/faq" className={linkClass}>
            FAQs
          </Link>
          <Link href="/terms" className={linkClass}>
            Terms
          </Link>
          <Link href="/privacy" className={linkClass}>
            Privacy
          </Link>
        </nav>
      </div>

      <div id="technician-footer-contact" className="border-t border-white/10 bg-ev-footer scroll-mt-4">
        <div className="ev-page-gutter py-10 sm:py-11">
          <h2 className={`${sectionTitle} mb-5`}>Registered office &amp; helpdesk</h2>
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-10 items-stretch">
            <div className="text-[13px] text-white/80 space-y-5 min-w-0">
              <dl className="space-y-3">
                <div>
                  <dt className="text-[11px] font-semibold uppercase tracking-wide text-white/45 mb-1">Sales desk</dt>
                  <dd>
                    <a href={publicTelHref(publicSalesPhone)} className="text-white hover:underline font-medium">
                      {formatIndianPhoneDisplay(publicSalesPhone)}
                    </a>
                  </dd>
                </div>
                <div>
                  <dt className="text-[11px] font-semibold uppercase tracking-wide text-white/45 mb-1">
                    Customer support
                  </dt>
                  <dd>
                    <a href={publicTelHref(publicSupportPhone)} className="text-white hover:underline font-medium">
                      {formatIndianPhoneDisplay(publicSupportPhone)}
                    </a>
                  </dd>
                </div>
                <div>
                  <dt className="text-[11px] font-semibold uppercase tracking-wide text-white/45 mb-1">Email</dt>
                  <dd className="space-y-1">
                    <div>
                      <a href={`mailto:${publicMarketingEmail}`} className="text-white/90 hover:underline break-all">
                        {publicMarketingEmail}
                      </a>
                      <span className="text-white/40"> — corporate &amp; dealer</span>
                    </div>
                    <div>
                      <a href={`mailto:${publicSupportEmail}`} className="text-white/90 hover:underline break-all">
                        {publicSupportEmail}
                      </a>
                      <span className="text-white/40"> — orders &amp; product help</span>
                    </div>
                    <div>
                      <a href={`mailto:${publicInfoEmail}`} className="text-white/90 hover:underline break-all">
                        {publicInfoEmail}
                      </a>
                      <span className="text-white/40"> — general enquiries</span>
                    </div>
                  </dd>
                </div>
              </dl>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-white/50 mb-2.5 mt-6 pt-6 border-t border-white/10">
                Payment options
              </p>
              <p className="text-[12px] leading-relaxed text-white/60 max-w-xl">
                Checkout is processed securely through PayU. You can pay with UPI, debit and credit cards, net banking, and
                supported wallets where enabled for your order.
              </p>
            </div>
            <div className="rounded-lg overflow-hidden border border-white/15 bg-black/25 min-h-[220px] lg:min-h-0 shadow-inner">
              <iframe
                title="Office location on Google Maps"
                src={publicOfficeMapEmbedUrl()}
                className="w-full h-[240px] lg:h-full lg:min-h-[260px] border-0"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-white/10 bg-ev-navbar/95">
        <div className="ev-page-gutter py-5 sm:py-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
            <div className="space-y-3 text-center sm:text-left min-w-0 flex-1">
              <p className="text-[12px] text-white/55">
                © {year} {publicCompanyLegalName}. All rights reserved.
              </p>
              <p className="text-[11px] leading-relaxed text-white/40 max-w-4xl">
                <span className="text-white/50 font-medium">Registered office: </span>
                {publicRegisteredAddress}
              </p>
            </div>
            <p className="text-[11px] text-white/40 shrink-0 flex flex-wrap items-center justify-center sm:justify-end gap-x-1.5 gap-y-1 sm:text-right">
              <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                <span>Made with</span>
                <Heart
                  className="size-3.5 text-ev-primary shrink-0"
                  fill="currentColor"
                  strokeWidth={0}
                  aria-label="love"
                />
                <span>by</span>
              </span>
              <a
                href="https://wa.me/918005586588"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-white/65 hover:text-white hover:underline"
              >
                Manya Shukla
              </a>
              <span className="text-white/45">· +91 8005586588</span>
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
