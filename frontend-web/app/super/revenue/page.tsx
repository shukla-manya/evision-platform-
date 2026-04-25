'use client';

import Link from 'next/link';
import { ArrowLeft, IndianRupee } from 'lucide-react';
import { SuperadminShell } from '@/components/superadmin/SuperadminShell';

export default function SuperadminRevenuePage() {
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
          <div className="w-10 h-10 rounded-xl bg-ev-primary/15 flex items-center justify-center">
            <IndianRupee className="text-ev-primary" size={20} />
          </div>
          <h1 className="text-2xl font-bold text-ev-text">Revenue</h1>
        </div>
        <p className="text-ev-muted leading-relaxed mb-6">
          Commercial revenue dashboards, exports, and date-range reporting will live here. The overview already shows a
          snapshot card; use Analytics for user and email counts until order revenue is wired end-to-end.
        </p>
        <Link href="/superadmin/analytics" className="ev-btn-primary text-sm py-2.5 px-5 inline-flex">
          Open analytics
        </Link>
      </main>
    </SuperadminShell>
  );
}
