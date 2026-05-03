'use client';

import Link from 'next/link';
import { Heart } from 'lucide-react';
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
        <div className="pt-5 flex flex-col gap-3 border-t border-white/10 sm:flex-row sm:items-end sm:justify-between sm:gap-4 sm:border-t-0 sm:pt-6">
          <p className="text-center text-[12px] text-white/50 sm:text-left">
            © {year} {publicCompanyLegalName}. All rights reserved.
          </p>
          <p className="text-center text-[11px] text-white/40 sm:text-right flex flex-wrap items-center justify-center gap-x-1 gap-y-0.5 sm:justify-end">
            <span className="inline-flex items-center gap-1">
              Made with
              <Heart
                className="size-3.5 text-ev-primary shrink-0"
                fill="currentColor"
                strokeWidth={0}
                aria-label="love"
              />
              by
            </span>{' '}
            <a
              href="https://wa.me/918005586588"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-white/65 hover:text-white hover:underline"
            >
              Manya Shukla
            </a>
            <span className="text-white/45"> · +91 8005586588</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
