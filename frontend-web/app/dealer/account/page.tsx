'use client';

import Link from 'next/link';
import { UserRound } from 'lucide-react';

export default function DealerAccountPage() {
  return (
    <div className="min-h-screen bg-ev-bg ev-shell-body">
      <div className="max-w-3xl mx-auto w-full min-w-0 ev-card p-6 sm:p-8">
        <h1 className="text-2xl font-bold text-ev-text flex items-center gap-2">
          <UserRound size={24} className="text-ev-primary" />
          Account
        </h1>
        <p className="text-ev-muted text-sm mt-2">
          Dealer accounts sign in with your mobile number and OTP. Wholesale pricing applies after GST verification by
          the platform team.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/login" className="ev-btn-primary text-sm py-2 px-4 inline-flex">
            Sign in
          </Link>
          <Link href="/dealer/dashboard" className="ev-btn-secondary text-sm py-2 px-4 inline-flex">
            Back to dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
