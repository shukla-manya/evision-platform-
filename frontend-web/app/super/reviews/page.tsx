'use client';

import Link from 'next/link';
import { ArrowLeft, Star } from 'lucide-react';
import { SuperadminShell } from '@/components/superadmin/SuperadminShell';

export default function SuperadminReviewsPage() {
  return (
    <SuperadminShell>
      <main className="p-6 sm:p-10 max-w-3xl">
        <Link
          href="/superadmin/dashboard"
          className="inline-flex items-center gap-1 text-sm text-ev-muted hover:text-ev-text mb-6"
        >
          <ArrowLeft size={16} />
          Overview
        </Link>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-ev-warning/25 flex items-center justify-center">
            <Star className="text-ev-warning" size={20} />
          </div>
          <h1 className="text-2xl font-bold text-ev-text">Reviews</h1>
        </div>
        <p className="text-ev-muted leading-relaxed">
          Moderation and aggregation for product and service reviews will appear here once the review APIs are exposed
          to superadmin.
        </p>
      </main>
    </SuperadminShell>
  );
}
