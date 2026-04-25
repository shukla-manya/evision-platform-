import Link from 'next/link';
import { PublicShell } from '@/components/public/PublicShell';
import { publicBrandName } from '@/lib/public-brand';

export default function AboutPage() {
  return (
    <PublicShell>
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
        <h1 className="text-3xl font-bold text-ev-text mb-4">About {publicBrandName}</h1>
        <p className="text-ev-muted leading-relaxed mb-8">
          {publicBrandName} brings together trusted camera shops, dealer pricing, and on-site technician services so you can buy with confidence
          and get help when you need it.
        </p>
        <h2 id="contact" className="text-lg font-semibold text-ev-text mb-2">
          Contact us
        </h2>
        <p className="text-ev-muted text-sm">Support email and phone will appear here for production.</p>
        <Link href="/shop" className="ev-btn-secondary inline-flex mt-8">
          Back to shop
        </Link>
      </main>
    </PublicShell>
  );
}
