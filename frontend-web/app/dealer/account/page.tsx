'use client';

import Link from 'next/link';
import { UserRound } from 'lucide-react';

export default function DealerAccountPage() {
  return (
    <div className="min-h-screen bg-ev-bg p-6 sm:p-10">
      <div className="max-w-3xl ev-card p-8">
        <h1 className="text-2xl font-bold text-ev-text flex items-center gap-2">
          <UserRound size={24} className="text-ev-primary" />
          Account
        </h1>
        <p className="text-ev-muted text-sm mt-2">
          Manage dealer account and security settings.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/reset-password?role=dealer" className="ev-btn-primary text-sm py-2 px-4 inline-flex">
            Change password
          </Link>
          <Link href="/dealer/dashboard" className="ev-btn-secondary text-sm py-2 px-4 inline-flex">
            Back to dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
