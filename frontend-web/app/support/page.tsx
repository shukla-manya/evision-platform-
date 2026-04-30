import type { Metadata } from 'next';
import Link from 'next/link';
import { PublicShell } from '@/components/public/PublicShell';
import { publicBrandName } from '@/lib/public-brand';

export const metadata: Metadata = {
  title: `Support — ${publicBrandName}`,
  description: `Get help with orders, products, and services on ${publicBrandName}.`,
};

export default function SupportPage() {
  return (
    <PublicShell>
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <p className="text-ev-muted text-sm font-medium uppercase tracking-wide mb-2">Help</p>
        <h1 className="text-3xl sm:text-4xl font-bold text-ev-text mb-4">Support</h1>
        <p className="text-ev-muted text-sm sm:text-base leading-relaxed mb-8">
          Choose the option that fits your question. Our team monitors the contact channel during business hours.
        </p>
        <ul className="space-y-3 text-ev-text text-sm font-medium">
          <li>
            <Link href="/contact" className="text-ev-primary hover:underline">
              Contact us
            </Link>
            <span className="text-ev-muted font-normal"> — orders, billing, and general enquiries</span>
          </li>
          <li>
            <Link href="/faq" className="text-ev-primary hover:underline">
              FAQs
            </Link>
            <span className="text-ev-muted font-normal"> — returns, shipping, and account help</span>
          </li>
          <li>
            <Link href="/service/request" className="text-ev-primary hover:underline">
              Book a technician
            </Link>
            <span className="text-ev-muted font-normal"> — installation and on-site service</span>
          </li>
        </ul>
      </main>
    </PublicShell>
  );
}
