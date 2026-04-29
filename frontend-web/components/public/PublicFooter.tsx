'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getRole, isLoggedIn } from '@/lib/auth';
import { publicBrandName } from '@/lib/public-brand';
import { EvisionLogo } from '@/components/brand/EvisionLogo';
import { publicLoginPath } from '@/lib/public-links';

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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-10 text-sm">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <EvisionLogo variant="full" wordmark={publicBrandName} height={36} tone="onDark" />
          </div>
          <ul className="space-y-2 text-white/70">
            <li>
              <Link href="/about" className="hover:text-white transition-colors">
                About us
              </Link>
            </li>
            <li>
              <Link href="/contact" className="hover:text-white transition-colors">
                Contact us
              </Link>
            </li>
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
        </div>

        <div>
          <p className="font-semibold text-white mb-3">Help</p>
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
            <li>
              <Link href="/privacy" className="hover:text-white transition-colors">
                Privacy policy
              </Link>
            </li>
          </ul>
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
