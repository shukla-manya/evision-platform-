'use client';

import Link from 'next/link';
import { ChevronUp } from 'lucide-react';
import { useEffect, useState } from 'react';
import { getRole, isLoggedIn } from '@/lib/auth';
import { publicBrandName } from '@/lib/public-brand';
import { EvisionLogo } from '@/components/brand/EvisionLogo';
import { publicLoginPath } from '@/lib/public-links';
import { footerPolicyLinks, footerQuickNavLinks } from '@/lib/site-quick-links';
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
  publicWhatsAppChatUrl,
} from '@/lib/public-contact';

const year = new Date().getFullYear();

/** Uppercase column titles — same rhythm as large retail footers. */
const colTitle = 'text-[11px] font-semibold uppercase tracking-[0.14em] text-white/90 mb-3';
const colLink = 'text-[13px] leading-snug text-white/65 hover:text-white transition-colors py-0.5 block w-fit max-w-full';

function isTechnicianRole(role: string | undefined) {
  return role === 'electrician' || role === 'electrician_pending' || role === 'electrician_rejected';
}

export function PublicFooter() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [role, setRole] = useState<string | undefined>(undefined);

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      setLoggedIn(isLoggedIn());
      setRole(getRole());
    });
    return () => cancelAnimationFrame(id);
  }, []);

  const shopper = role === 'customer' || role === 'dealer';
  const technician = isTechnicianRole(role);

  const scrollTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="mt-auto border-t border-ev-border bg-ev-navbar pb-[env(safe-area-inset-bottom)] text-white">
      {/* Back to top — common on Amazon / Flipkart */}
      <div className="border-b border-white/10 bg-ev-hover/90">
        <div className="mx-auto w-full max-w-none ev-page-gutter">
          <button
            type="button"
            onClick={scrollTop}
            className="flex w-full items-center justify-center gap-1.5 py-2.5 text-sm font-medium text-white/95 hover:bg-white/[0.06] transition-colors"
          >
            <ChevronUp className="size-4 shrink-0 opacity-90" aria-hidden />
            Back to top
          </button>
        </div>
      </div>

      <div className="mx-auto w-full max-w-none ev-page-gutter py-10 sm:py-12">
        <div className="flex flex-col gap-10 lg:flex-row lg:gap-12 xl:gap-16">
          <div className="shrink-0 lg:max-w-[280px]">
            <div className="flex items-center gap-2 mb-3">
              <EvisionLogo variant="full" wordmark={publicBrandName} height={34} tone="onDark" />
            </div>
            <p className="text-[13px] leading-relaxed text-white/55">
              CCTV, PoE networking, and security accessories sold online with order tracking and PayU checkout. Dealer and
              technician programmes available.
            </p>
          </div>

          <div className="grid min-w-0 flex-1 grid-cols-2 gap-x-6 gap-y-9 sm:grid-cols-3 lg:grid-cols-5">
            <div>
              <h2 className={colTitle}>Help &amp; information</h2>
              <ul className="space-y-2">
                {footerQuickNavLinks.map((item) => (
                  <li key={`hi-${item.href}`}>
                    <Link href={item.href} className={colLink}>
                      {item.label}
                    </Link>
                  </li>
                ))}
                <li>
                  <Link href="/faq" className={colLink}>
                    FAQs
                  </Link>
                </li>
                <li>
                  <a href={publicWhatsAppChatUrl()} className={colLink} target="_blank" rel="noopener noreferrer">
                    WhatsApp support
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h2 className={colTitle}>Shop</h2>
              <ul className="space-y-2">
                <li>
                  <Link href="/shop" className={colLink}>
                    All products
                  </Link>
                </li>
                <li>
                  <Link href="/brands" className={colLink}>
                    Brands
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h2 className={colTitle}>Legal &amp; policies</h2>
              <ul className="space-y-2">
                {footerPolicyLinks.map((item) => (
                  <li key={item.href}>
                    <Link href={item.href} className={colLink}>
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h2 className={colTitle}>Installation &amp; partners</h2>
              <ul className="space-y-2">
                <li>
                  <Link href="/service/request" className={colLink}>
                    Book a technician
                  </Link>
                </li>
                <li>
                  <Link href="/technician-services#areas" className={colLink}>
                    Service areas
                  </Link>
                </li>
                <li>
                  <Link href="/register?role=dealer" className={colLink}>
                    Become a dealer
                  </Link>
                </li>
                {!loggedIn ? (
                  <li>
                    <Link href="/register?role=electrician" className={colLink}>
                      Register as technician
                    </Link>
                  </li>
                ) : null}
              </ul>
            </div>

            <div>
              <h2 className={colTitle}>Your account</h2>
              {loggedIn ? (
                shopper ? (
                  <ul className="space-y-2">
                    <li>
                      <Link href="/" className={colLink}>
                        Home
                      </Link>
                    </li>
                    <li>
                      <Link href="/orders" className={colLink}>
                        My orders
                      </Link>
                    </li>
                    <li>
                      <Link href="/profile" className={colLink}>
                        Profile
                      </Link>
                    </li>
                  </ul>
                ) : technician ? (
                  <ul className="space-y-2">
                    <li>
                      <Link href="/electrician/dashboard" className={colLink}>
                        Technician dashboard
                      </Link>
                    </li>
                    <li>
                      <Link href="/profile" className={colLink}>
                        Profile
                      </Link>
                    </li>
                  </ul>
                ) : role === 'admin' ? (
                  <ul className="space-y-2">
                    <li>
                      <Link href="/contact" className={colLink}>
                        Contact support
                      </Link>
                    </li>
                  </ul>
                ) : role === 'superadmin' ? (
                  <ul className="space-y-2">
                    <li>
                      <Link href="/super/dashboard" className={colLink}>
                        Superadmin
                      </Link>
                    </li>
                  </ul>
                ) : (
                  <ul className="space-y-2">
                    <li>
                      <Link href="/profile" className={colLink}>
                        Profile
                      </Link>
                    </li>
                  </ul>
                )
              ) : (
                <ul className="space-y-2">
                  <li>
                    <Link href={publicLoginPath} className={colLink}>
                      Sign in
                    </Link>
                  </li>
                  <li>
                    <Link href="/register" className={colLink}>
                      Create account
                    </Link>
                  </li>
                  <li>
                    <Link href={publicLoginPath} className={`${colLink} text-white/45`} title="Sign in to view returns">
                      Returns &amp; order help
                    </Link>
                  </li>
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>

      <div id="site-footer-contact" className="border-t border-white/10 bg-ev-footer scroll-mt-4">
        <div className="mx-auto w-full max-w-none ev-page-gutter py-10 sm:py-11">
          <h2 className={`${colTitle} mb-5`}>Registered office &amp; helpdesk</h2>
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

        <div className="border-t border-white/10">
          <div className="mx-auto w-full max-w-none ev-page-gutter py-5 sm:py-6">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-white/50 mb-2.5">Payment options</p>
            <p className="text-[12px] leading-relaxed text-white/60 max-w-3xl">
              Checkout is processed securely through PayU. You can pay with UPI, debit and credit cards, net banking, and
              supported wallets where enabled for your order.
            </p>
          </div>
        </div>
      </div>

      <div className="border-t border-white/10 bg-ev-navbar/95">
        <div className="mx-auto w-full max-w-none ev-page-gutter py-5 sm:py-6 space-y-3 text-center sm:text-left">
          <p className="text-[12px] text-white/55">
            © {year} {publicCompanyLegalName}. All rights reserved.
          </p>
          <p className="text-[11px] leading-relaxed text-white/40 max-w-4xl">
            <span className="text-white/50 font-medium">Registered office: </span>
            {publicRegisteredAddress}
          </p>
        </div>
      </div>
    </footer>
  );
}
