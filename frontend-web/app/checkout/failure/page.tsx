import Link from 'next/link';
import { AlertCircle } from 'lucide-react';
import { PublicShell } from '@/components/public/PublicShell';

export default function CheckoutFailurePage() {
  return (
    <PublicShell>
      <main className="ev-container py-16 text-center">
        <div className="ev-card p-10">
          <div className="w-16 h-16 bg-ev-error/10 border-2 border-ev-error/30 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle size={32} className="text-ev-error" />
          </div>
          <h1 className="text-2xl font-bold text-ev-text mb-3">Payment did not go through</h1>
          <p className="text-ev-muted text-sm leading-relaxed mb-6">
            No money was charged for this attempt. Your cart is unchanged. Please try again, use another card or UPI ID,
            or contact your bank if the problem persists. You can return to the cart to review items before retrying.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/checkout" className="ev-btn-primary">
              Try again
            </Link>
            <Link href="/cart" className="ev-btn-secondary">
              Back to cart
            </Link>
          </div>
        </div>
      </main>
    </PublicShell>
  );
}
