'use client';

import Link from 'next/link';
import { ElectricianShell } from '@/components/electrician/ElectricianShell';

export default function ElectricianSettingsPage() {
  return (
    <ElectricianShell>
      <div className="max-w-2xl ev-card p-8 space-y-5">
        <h1 className="text-2xl font-bold text-ev-text">Electrician Settings</h1>
        <p className="text-ev-muted text-sm">
          Use profile page for account details and availability.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link href="/electrician/profile" className="ev-btn-primary inline-flex">
            Open Profile
          </Link>
          <Link href="/reset-password?role=electrician" className="ev-btn-secondary inline-flex">
            Change Password (OTP)
          </Link>
        </div>
      </div>
    </ElectricianShell>
  );
}
