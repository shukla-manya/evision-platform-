import type { Metadata } from 'next';
import Link from 'next/link';
import { PublicShell } from '@/components/public/PublicShell';
import { publicBrandName } from '@/lib/public-brand';

export const metadata: Metadata = {
  title: `Blog — ${publicBrandName}`,
  description: `Security tips, product guides, and updates from ${publicBrandName}.`,
};

export default function BlogPage() {
  return (
    <PublicShell>
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <p className="text-ev-muted text-sm font-medium uppercase tracking-wide mb-2">Blog</p>
        <h1 className="text-3xl sm:text-4xl font-bold text-ev-text mb-4">Insights &amp; updates</h1>
        <p className="text-ev-muted leading-relaxed mb-8">
          We are building a library of articles on CCTV planning, PoE networking, and safe installation. In the meantime,
          browse the shop or reach our team for project-specific advice.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link href="/shop" className="ev-btn-primary text-sm">
            Browse shop
          </Link>
          <Link href="/contact" className="ev-btn-secondary text-sm">
            Contact us
          </Link>
        </div>
      </main>
    </PublicShell>
  );
}
