'use client';

import Link from 'next/link';
import { ArrowLeft, Wallet } from 'lucide-react';
import { SuperadminShell } from '@/components/superadmin/SuperadminShell';

export default function SuperadminSettlementsPage() {
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
          <div className="w-10 h-10 rounded-xl bg-ev-indigo/30 flex items-center justify-center">
            <Wallet className="text-white" size={20} />
          </div>
          <h1 className="text-2xl font-bold text-ev-text">Settlements</h1>
        </div>
        <p className="text-ev-muted leading-relaxed">
          Payout batches, shop statements, and reconciliation tools will be added when finance flows are connected.
        </p>
      </main>
    </SuperadminShell>
  );
}
