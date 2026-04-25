import Link from 'next/link';
import { PublicShell } from '@/components/public/PublicShell';

export default function BrandsPage() {
  return (
    <PublicShell>
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
        <h1 className="text-3xl font-bold text-ev-text mb-2">Brands</h1>
        <p className="text-ev-muted mb-8">
          Shop Canon, Sony, Sigma, GoPro and more across verified partner stores. Use brand filters on the catalogue.
        </p>
        <Link href="/shop" className="ev-btn-primary inline-flex">
          Shop by brand
        </Link>
      </main>
    </PublicShell>
  );
}
