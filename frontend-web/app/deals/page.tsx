import Link from 'next/link';
import { PublicShell } from '@/components/public/PublicShell';

export default function DealsPage() {
  return (
    <PublicShell>
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
        <h1 className="text-3xl font-bold text-ev-text mb-2">Deals</h1>
        <p className="text-ev-muted mb-8">Limited-time offers from partner stores. Browse the catalogue and watch this space for curated deal drops.</p>
        <Link href="/shop" className="ev-btn-primary inline-flex">
          Browse all products
        </Link>
      </main>
    </PublicShell>
  );
}
