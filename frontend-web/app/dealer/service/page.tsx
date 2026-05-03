'use client';

import Link from 'next/link';
import { LifeBuoy } from 'lucide-react';
import { DealerGstPendingBanner } from '@/components/dealer/DealerGstPendingBanner';

export default function DealerServicePage() {
  return (
    <div className="min-h-screen bg-ev-bg ev-shell-body">
      <DealerGstPendingBanner bleedGutter />
      <div className="max-w-3xl mx-auto w-full min-w-0 ev-card p-6 sm:p-8">
        <h1 className="text-2xl font-bold text-ev-text flex items-center gap-2">
          <LifeBuoy size={24} className="text-ev-primary" />
          Service
        </h1>
        <p className="text-ev-muted text-sm mt-2">
          Service requests for dealer purchases will appear here soon.
        </p>
        <div className="mt-6">
          <Link href="/dealer/dashboard" className="ev-btn-secondary text-sm py-2 px-4 inline-flex">
            Back to dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
