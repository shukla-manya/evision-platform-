'use client';

import Link from 'next/link';
import { ELECTRICIAN_SUPPORT_EMAIL } from '@/lib/electrician-ui';
import { publicCompanyLegalName } from '@/lib/public-contact';

const year = new Date().getFullYear();

const linkClass =
  'text-[13px] leading-snug text-white/70 hover:text-white transition-colors py-0.5';

/**
 * Compact footer for the technician workspace — same dark strip as the public site
 * without shop, dealer, maps, or account marketing columns.
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
        <p className="pt-5 text-center text-[12px] text-white/50 sm:pt-6 sm:text-left">
          © {year} {publicCompanyLegalName}. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
