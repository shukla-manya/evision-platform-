import Link from 'next/link';
import { Camera } from 'lucide-react';
import { publicBrandName } from '@/lib/public-brand';
import { publicAdminRegisterUrl, publicAdminSignInUrl, publicLoginPath, publicRegisterPath } from '@/lib/public-links';

const year = 2026;

export function PublicFooter() {
  return (
    <footer className="mt-auto border-t border-ev-border bg-ev-navbar pb-[env(safe-area-inset-bottom)] text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-10 text-sm">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-9 h-9 bg-gradient-primary rounded-lg flex items-center justify-center shadow-ev-glow">
              <Camera size={18} className="text-white" />
            </div>
            <span className="font-bold text-lg">{publicBrandName}</span>
          </div>
          <ul className="space-y-2 text-white/70">
            <li>
              <Link href="/about" className="hover:text-white transition-colors">
                About us
              </Link>
            </li>
            <li>
              <span className="text-white/45">Careers</span>
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
              <Link href="/deals" className="hover:text-white transition-colors">
                Deals
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
            <li>
              <Link href="/register?role=electrician" className="hover:text-white transition-colors">
                Join as technician
              </Link>
            </li>
            <li>
              <Link href="/technician-services#areas" className="hover:text-white transition-colors">
                Service areas
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <p className="font-semibold text-white mb-3">Account</p>
          <ul className="space-y-2 text-white/80">
            <li>
              <Link href={publicLoginPath} className="hover:text-white transition-colors font-medium">
                Sign in
              </Link>
            </li>
            <li>
              <Link href={publicRegisterPath} className="hover:text-white transition-colors font-medium">
                Sign up
              </Link>
            </li>
          </ul>
          <p className="font-semibold text-white mt-5 mb-2 text-sm">Shop admin</p>
          <p className="text-[11px] text-white/50 leading-snug mb-2">Store owners: email + password on the admin app</p>
          <ul className="space-y-2 text-white/80">
            <li>
              <a
                href={publicAdminSignInUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-white transition-colors font-medium"
              >
                Admin sign in
              </a>
            </li>
            <li>
              <a
                href={publicAdminRegisterUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-white transition-colors font-medium"
              >
                Register your shop
              </a>
            </li>
          </ul>
        </div>

        <div>
          <p className="font-semibold text-white mb-3">Help</p>
          <ul className="space-y-2 text-white/70">
            <li>
              <Link href="/faq" className="hover:text-white transition-colors">
                FAQs
              </Link>
            </li>
            <li>
              <span className="text-white/45">Returns</span>
            </li>
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
          <span>© {year} e vision Pvt. Ltd. Payments secured by Razorpay.</span>
        </div>
      </div>
    </footer>
  );
}
