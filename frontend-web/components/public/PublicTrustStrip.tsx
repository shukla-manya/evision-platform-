import Link from 'next/link';
import { Truck } from 'lucide-react';
import { publicSupportPhone } from '@/lib/public-contact';

export function PublicTrustStrip() {
  const tel = `tel:${publicSupportPhone.replace(/\s/g, '')}`;
  return (
    <section className="border-b border-ev-border bg-ev-surface" aria-label="Support and shipping">
      <div className="ev-container py-3 flex flex-col sm:flex-row flex-wrap items-center justify-center gap-4 sm:gap-10 text-sm text-ev-text">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-ev-primary">24/7 Support</span>
          <Link href={tel} className="text-ev-muted hover:text-ev-primary">
            {publicSupportPhone}
          </Link>
        </div>
        <div className="hidden sm:block h-4 w-px bg-ev-border" aria-hidden />
        <div className="flex items-center gap-2 text-ev-muted">
          <Truck size={18} className="text-ev-primary shrink-0" aria-hidden />
          <span>
            <strong className="text-ev-text">Free Shipping</strong> — All over India
          </span>
        </div>
      </div>
    </section>
  );
}
