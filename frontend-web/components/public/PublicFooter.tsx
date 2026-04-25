import Link from 'next/link';
import { Camera } from 'lucide-react';
import { publicBrandName } from '@/lib/public-brand';

const year = 2026;

export function PublicFooter() {
  return (
    <footer className="mt-auto border-t border-ev-border bg-ev-navbar text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 text-sm">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-9 h-9 bg-gradient-primary rounded-lg flex items-center justify-center shadow-ev-glow">
              <Camera size={18} className="text-white" />
            </div>
            <span className="font-bold text-lg">{publicBrandName}</span>
          </div>
          <p className="text-white/65 leading-relaxed mb-4">India&apos;s trusted camera marketplace</p>
          <p className="text-white/45 text-xs">Social links coming soon</p>
        </div>
        <div>
          <p className="font-semibold text-white mb-3">Shop</p>
          <ul className="space-y-2 text-white/70">
            <li>
              <Link href="/shop" className="hover:text-white transition-colors">
                All Products
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
            <li>
              <Link href="/shop?sort=newest" className="hover:text-white transition-colors">
                New Arrivals
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <p className="font-semibold text-white mb-3">Services</p>
          <ul className="space-y-2 text-white/70">
            <li>
              <Link href="/technician-services" className="hover:text-white transition-colors">
                Book a Technician
              </Link>
            </li>
            <li>
              <Link href="/technician/register" className="hover:text-white transition-colors">
                Technician Network
              </Link>
            </li>
            <li>
              <Link href="/technician-services#areas" className="hover:text-white transition-colors">
                Service Areas
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <p className="font-semibold text-white mb-3">Help</p>
          <ul className="space-y-2 text-white/70">
            <li>
              <Link href="/about#contact" className="hover:text-white transition-colors">
                Contact Us
              </Link>
            </li>
            <li>
              <span className="text-white/45">FAQs</span>
            </li>
            <li>
              <span className="text-white/45">Return Policy</span>
            </li>
            <li>
              <span className="text-white/45">Privacy Policy</span>
            </li>
            <li>
              <span className="text-white/45">Terms</span>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-white/50 text-center sm:text-left">
          <span>
            © {year} E Vision Pvt. Ltd. All rights reserved · Payments secured by Razorpay
          </span>
        </div>
      </div>
    </footer>
  );
}
