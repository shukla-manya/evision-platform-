'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getRole } from '@/lib/auth';

export default function ElectricianDashboardPage() {
  const router = useRouter();

  useEffect(() => {
    const role = getRole();
    if (!role) {
      router.replace('/electrician/login');
      return;
    }
    if (role !== 'electrician') {
      router.replace('/login');
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-ev-bg px-4 py-10">
      <div className="max-w-3xl mx-auto ev-card p-8 space-y-4">
        <h1 className="text-2xl font-bold text-ev-text">Electrician Dashboard</h1>
        <p className="text-ev-muted text-sm">
          Web access for electrician role. Use settings to change password with mobile OTP.
        </p>
        <div className="flex gap-3">
          <Link href="/electrician/settings" className="ev-btn-primary">
            Open Settings
          </Link>
          <Link href="/reset-password?role=electrician" className="ev-btn-secondary">
            Forgot Password
          </Link>
        </div>
      </div>
    </div>
  );
}
