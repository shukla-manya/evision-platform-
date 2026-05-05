'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2 } from 'lucide-react';
import { PublicShell } from '@/components/public/PublicShell';

function DoneInner() {
  const sp = useSearchParams();
  const name = sp.get('name') || 'the technician';

  return (
    <PublicShell>
      <main className="ev-container py-16 text-center">
        <div className="ev-card p-10">
          <CheckCircle2 className="mx-auto text-ev-success mb-4" size={40} />
          <p className="text-ev-text font-medium leading-relaxed">
            Thank you for your review! It&apos;s now live on {decodeURIComponent(name)}&apos;s profile.
          </p>
          <Link href="/" className="ev-btn-primary inline-flex mt-8">
            Back to home
          </Link>
        </div>
      </main>
    </PublicShell>
  );
}

export default function ReviewDonePage() {
  return (
    <Suspense
      fallback={
        <PublicShell>
          <div className="py-24 text-center">Loading…</div>
        </PublicShell>
      }
    >
      <DoneInner />
    </Suspense>
  );
}
