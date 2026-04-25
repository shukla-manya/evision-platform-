'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getRole } from '@/lib/auth';

export default function ElectricianSettingsPage() {
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
      <div className="max-w-2xl mx-auto ev-card p-8 space-y-5">
        <h1 className="text-2xl font-bold text-ev-text">Electrician Settings</h1>
        <p className="text-ev-muted text-sm">
          Password changes are OTP-verified on your registered mobile number.
        </p>
        <Link href="/reset-password?role=electrician" className="ev-btn-primary inline-flex">
          Change Password (OTP)
        </Link>
      </div>
    </div>
  );
}
