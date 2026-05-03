'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2 } from 'lucide-react';
import { PublicShell } from '@/components/public/PublicShell';

function SuccessInner() {
  const sp = useSearchParams();
  const ref = sp.get('ref') || 'your order';
  const shipments = Number(sp.get('shipments') || '1');

  return (
    <PublicShell>
      <main className="max-w-lg mx-auto px-4 py-16 text-center">
        <div className="ev-card p-10">
          <div className="w-16 h-16 bg-ev-success/10 border-2 border-ev-success rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 size={32} className="text-ev-success" />
          </div>
          <h1 className="text-2xl font-bold text-ev-text mb-3">Payment successful</h1>
          <p className="text-ev-muted text-sm leading-relaxed mb-6">
            Thank you — your order is confirmed. Reference <span className="text-ev-text font-semibold">#{ref}</span>.
            We are preparing {shipments === 1 ? 'one shipment' : `${shipments} shipments`} for dispatch. You will receive
            email updates; open <strong className="text-ev-text">My orders</strong> anytime for tracking. PDF invoices
            (including dealer and GST tax invoices when your account qualifies) are added <strong className="text-ev-text">after delivery</strong>, and we email you the same links.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/orders" className="ev-btn-primary">
              Track orders
            </Link>
            <Link href="/" className="ev-btn-secondary">
              Back to home
            </Link>
          </div>
        </div>
      </main>
    </PublicShell>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense
      fallback={
        <PublicShell>
          <div className="py-24 text-center text-ev-muted">Loading…</div>
        </PublicShell>
      }
    >
      <SuccessInner />
    </Suspense>
  );
}
