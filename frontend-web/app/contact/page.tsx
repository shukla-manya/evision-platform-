import type { Metadata } from 'next';
import Link from 'next/link';
import { Mail, MapPin, Phone } from 'lucide-react';
import { PublicShell } from '@/components/public/PublicShell';
import { publicBrandName } from '@/lib/public-brand';
import { publicCompanyLegalName, publicSupportEmail, publicSupportPhone } from '@/lib/public-contact';

export const metadata: Metadata = {
  title: `Contact us — ${publicBrandName}`,
  description: `Get in touch with ${publicBrandName} support for orders, accounts, and general enquiries.`,
};

export default function ContactPage() {
  const mailHref = `mailto:${publicSupportEmail}`;
  const telHref = `tel:${publicSupportPhone.replace(/\s/g, '')}`;

  return (
    <PublicShell>
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <p className="text-ev-muted text-sm font-medium uppercase tracking-wide mb-2">Help</p>
        <h1 className="text-3xl sm:text-4xl font-bold text-ev-text mb-4">Contact us</h1>
        <p className="text-ev-muted leading-relaxed mb-10">
          We are here for questions about orders, your account, dealers and technicians, or shop partnerships. For quick
          answers, see our{' '}
          <Link href="/faq" className="text-ev-primary hover:text-ev-primary-light font-medium">
            FAQs
          </Link>
          .
        </p>

        <div className="ev-card p-6 sm:p-8 space-y-8">
          <div>
            <div className="flex items-center gap-2 text-ev-text font-semibold mb-3">
              <Mail size={18} className="text-ev-primary shrink-0" />
              Email
            </div>
            <a href={mailHref} className="text-ev-primary hover:text-ev-primary-light font-medium text-lg break-all">
              {publicSupportEmail}
            </a>
            <p className="text-ev-muted text-sm mt-2">We aim to reply within one to two business days.</p>
          </div>

          <div className="border-t border-ev-border pt-8">
            <div className="flex items-center gap-2 text-ev-text font-semibold mb-3">
              <Phone size={18} className="text-ev-primary shrink-0" />
              Phone
            </div>
            <a href={telHref} className="text-ev-primary hover:text-ev-primary-light font-medium text-lg">
              {publicSupportPhone}
            </a>
            <p className="text-ev-muted text-sm mt-2">Monday to Saturday, 10:00–18:00 IST (hours may vary on holidays).</p>
          </div>

          <div className="border-t border-ev-border pt-8">
            <div className="flex items-center gap-2 text-ev-text font-semibold mb-3">
              <MapPin size={18} className="text-ev-primary shrink-0" />
              Registered office
            </div>
            <p className="text-ev-muted text-sm leading-relaxed">
              {publicCompanyLegalName}
              <br />
              India
            </p>
          </div>
        </div>

        <div className="mt-10 flex flex-wrap gap-3">
          <Link href="/about" className="ev-btn-secondary text-sm">
            About {publicBrandName}
          </Link>
          <Link href="/shop" className="ev-btn-primary text-sm">
            Continue shopping
          </Link>
        </div>
      </main>
    </PublicShell>
  );
}
