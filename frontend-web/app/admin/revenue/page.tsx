'use client';

import Link from 'next/link';
import { TrendingUp } from 'lucide-react';
import { AdminShell } from '@/components/admin/AdminShell';

export default function AdminRevenuePage() {
  return (
    <AdminShell>
      <main className="p-6 sm:p-10">
        <h1 className="text-2xl font-bold text-ev-text flex items-center gap-2 mb-2">
          <TrendingUp size={26} className="text-ev-primary" />
          Revenue
        </h1>
        <p className="text-ev-muted text-sm mb-8">Settlements and payout history will live here.</p>
        <div className="ev-card p-10 text-center text-ev-muted text-sm max-w-lg">
          Detailed revenue reports are coming soon. For now, see the summary on your{' '}
          <Link href="/admin/dashboard" className="text-ev-primary hover:underline font-medium">
            dashboard
          </Link>
          .
        </div>
      </main>
    </AdminShell>
  );
}
