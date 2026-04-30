'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getRole, isLoggedIn } from '@/lib/auth';
import { publicBrandName } from '@/lib/public-brand';
import { EvisionLogo } from '@/components/brand/EvisionLogo';
import { publicLoginPath } from '@/lib/public-links';
import { footerPolicyLinks, footerQuickNavLinks } from '@/lib/site-quick-links';
import {
  formatIndianPhoneDisplay,
  publicMarketingEmail,
  publicOfficeGoogleMapsOpenUrl,
  publicOfficeMapEmbedUrl,
  publicRegisteredAddress,
  publicSalesPhone,
  publicSupportEmail,
  publicSupportPhone,
  publicTelHref,
} from '@/lib/public-contact';

const year = 2026;

function isTechnicianRole(role: string | undefined) {
  return role === 'electrician' || role === 'electrician_pending' || role === 'electrician_rejected';
}

export function PublicFooter() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [role, setRole] = useState<string | undefined>(undefined);

  useEffect(() => {
    setLoggedIn(isLoggedIn());
    setRole(getRole());
  }, []);

  const shopper = role === 'customer' || role === 'dealer';
  const technician = isTechnicianRole(role);

  return (
    <footer className="mt-auto border-t border-ev-border bg-ev-navbar pb-[env(safe-area-inset-bottom)] text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-6 gap-10 text-sm">
        <div className="xl:col-span-1">
          <div className="flex items-center gap-2 mb-3">
            <EvisionLogo variant="full" wordmark={publicBrandName} height={36} tone="onDark" />
          </div>
          <p className="text-white/55 text-xs leading-relaxed max-w-[220px]">
            Surveillance, PoE networking, and partner shops — one checkout.
          </p>
        </div>

        <div>
          <p className="font-semibold text-white mb-3">Quick links</p>
          <ul className="space-y-2 text-white/70">
            {footerQuickNavLinks.map((item) => (
              <li key={item.href + item.label}>
                <Link href={item.href} className="hover:text-white transition-colors">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="font-semibold text-white mb-3">Policies</p>
          <ul className="space-y-2 text-white/70">
            {footerPolicyLinks.map((item) => (
              <li key={item.href + item.label}>
                <Link href={item.href} className="hover:text-white transition-colors">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="font-semibold text-white mb-3">Shop</p>
          <ul className="space-y-2 text-white/70">
            <li>
              <Link href="/shop" className="hover:text-white transition-colors">
                All products
              </Link>
            </li>
            <li>
              <Link href="/brands" className="hover:text-white transition-colors">
                Brands
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <p className="font-semibold text-white mb-3">Services</p>
          <ul className="space-y-2 text-white/70">
            <li>
              <Link href="/service/request" className="hover:text-white transition-colors">
                Book a technician
              </Link>
            </li>
            {!loggedIn ? (
              <li>
                <Link href="/register?role=electrician" className="hover:text-white transition-colors">
                  Join as technician
                </Link>
              </li>
            ) : null}
            <li>
              <Link href="/technician-services#areas" className="hover:text-white transition-colors">
                Service areas
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <p className="font-semibold text-white mb-3">Account</p>
          {loggedIn ? (
            shopper ? (
              <ul className="space-y-2 text-white/80">
                <li>
                  <Link href="/" className="hover:text-white transition-colors font-medium">
                    Home
                  </Link>
                </li>
                <li>
                  <Link href="/orders" className="hover:text-white transition-colors font-medium">
                    My orders
                  </Link>
                </li>
                <li>
                  <Link href="/profile" className="hover:text-white transition-colors font-medium">
                    Profile
                  </Link>
                </li>
              </ul>
            ) : technician ? (
              <ul className="space-y-2 text-white/80">
                <li>
                  <Link href="/electrician/dashboard" className="hover:text-white transition-colors font-medium">
                    Technician home
                  </Link>
                </li>
                <li>
                  <Link href="/profile" className="hover:text-white transition-colors font-medium">
                    Profile
                  </Link>
                </li>
              </ul>
            ) : role === 'admin' ? (
              <ul className="space-y-2 text-white/80">
                <li>
                  <Link href="/contact" className="hover:text-white transition-colors font-medium">
                    Contact support
                  </Link>
                </li>
              </ul>
            ) : role === 'superadmin' ? (
              <ul className="space-y-2 text-white/80">
                <li>
                  <Link href="/super/dashboard" className="hover:text-white transition-colors font-medium">
                    Superadmin
                  </Link>
                </li>
              </ul>
            ) : (
              <ul className="space-y-2 text-white/80">
                <li>
                  <Link href="/profile" className="hover:text-white transition-colors font-medium">
                    Profile
                  </Link>
                </li>
              </ul>
            )
          ) : (
            <ul className="space-y-2 text-white/80">
              <li>
                <Link href={publicLoginPath} className="hover:text-white transition-colors font-medium">
                  Sign in
                </Link>
              </li>
              <li>
                <Link href="/register" className="hover:text-white transition-colors font-medium">
                  Create account
                </Link>
              </li>
            </ul>
          )}
          <p className="font-semibold text-white mb-2 mt-6">Help</p>
          <ul className="space-y-2 text-white/70">
            <li>
              <Link href="/faq" className="hover:text-white transition-colors">
                FAQs
              </Link>
            </li>
            {!loggedIn ? (
              <li>
                <Link
                  href={publicLoginPath}
                  className="text-white/45 hover:text-white transition-colors cursor-pointer"
                  title="Sign in to view returns and order help"
                >
                  Returns
                </Link>
              </li>
            ) : null}
          </ul>
        </div>
      </div>

      <div id="site-footer-contact" className="border-t border-white/10 scroll-mt-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
          <p className="font-semibold text-white mb-4 text-sm">Contact information</p>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
            <ul className="text-sm text-white/80 space-y-3">
              <li>
                <a href={publicTelHref(publicSalesPhone)} className="text-white hover:underline">
                  {formatIndianPhoneDisplay(publicSalesPhone)}
                </a>
              </li>
              <li>
                <a href={publicTelHref(publicSupportPhone)} className="text-white hover:underline">
                  {formatIndianPhoneDisplay(publicSupportPhone)}
                </a>
              </li>
              <li>
                <a href={`mailto:${publicMarketingEmail}`} className="text-white hover:underline">
                  {publicMarketingEmail}
                </a>
              </li>
              <li>
                <a href={`mailto:${publicSupportEmail}`} className="text-white hover:underline">
                  {publicSupportEmail}
                </a>
              </li>
              <li className="leading-relaxed text-white/75 pt-1">
                <a
                  href={publicOfficeGoogleMapsOpenUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white hover:underline"
                >
                  {publicRegisteredAddress}
                </a>
              </li>
            </ul>
            <div className="rounded-xl overflow-hidden border border-white/15 bg-black/20 min-h-[220px] lg:min-h-0">
              <iframe
                title="E-Vision India office on Google Maps"
                src={publicOfficeMapEmbedUrl()}
                className="w-full h-[240px] lg:h-full lg:min-h-[260px] border-0"
                loading="eager"
                referrerPolicy="no-referrer-when-downgrade"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-white/50 text-center sm:text-left">
          <span>
            © {year} Evision · E vision Pvt. Ltd. · Powered by Cybrical Tech LLP. Payments secured by PayU.
          </span>
          <span className="text-white/40">Made with love by Manya Shukla · {year}</span>
        </div>
      </div>
    </footer>
  );
}
