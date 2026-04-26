'use client';

import Link from 'next/link';
import { Bell } from 'lucide-react';
import { ElectricianShell } from '@/components/electrician/ElectricianShell';
import { ELECTRICIAN_SUPPORT_EMAIL } from '@/lib/electrician-ui';

const NOTIFICATION_EXAMPLES = [
  {
    title: 'New booking',
    body: 'New booking request from [Customer name] — [issue summary]. Respond within 2 hours.',
  },
  {
    title: 'Order nearby',
    body: '[Product] was just ordered in [Area], [X] km from you. This customer may need service soon.',
  },
  {
    title: 'Booking expiry',
    body: 'Reminder: You have a booking request expiring in 30 minutes. Tap to respond.',
  },
  {
    title: 'New review',
    body: '[Customer name] left you a [X]-star review. Tap to read it.',
  },
  {
    title: 'Account approved',
    body: 'Welcome to e vision! Your account has been approved. Go online to start receiving job requests.',
  },
];

export default function ElectricianSettingsPage() {
  return (
    <ElectricianShell>
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="ev-card p-8 space-y-5">
          <h1 className="text-2xl font-bold text-ev-text">Settings</h1>
          <p className="text-ev-muted text-sm">
            Update your profile from the profile page. For password changes, use the secure OTP flow.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/electrician/profile" className="ev-btn-primary inline-flex text-sm py-2.5 px-4">
              Open profile
            </Link>
            <Link href="/reset-password?role=electrician" className="ev-btn-secondary inline-flex text-sm py-2.5 px-4">
              Change password (OTP)
            </Link>
          </div>
        </div>

        <div className="ev-card p-8 space-y-4">
          <h2 className="text-ev-text font-semibold flex items-center gap-2">
            <Bell size={20} className="text-ev-primary" />
            Push notifications you receive
          </h2>
          <p className="text-ev-muted text-xs leading-relaxed">
            When you enable notifications on your device, you may see alerts like the examples below (wording may vary
            slightly by platform). Booking expiry reminders may be added as scheduled notifications in a future release.
          </p>
          <ul className="space-y-3">
            {NOTIFICATION_EXAMPLES.map((n) => (
              <li key={n.title} className="rounded-xl border border-ev-border bg-ev-surface2/40 p-4">
                <p className="text-ev-text text-sm font-semibold">{n.title}</p>
                <p className="text-ev-muted text-xs mt-1 leading-relaxed">{n.body}</p>
              </li>
            ))}
          </ul>
          <a href={`mailto:${ELECTRICIAN_SUPPORT_EMAIL}`} className="ev-btn-secondary text-sm py-2 px-4 inline-flex w-fit mt-2">
            Email support
          </a>
          <p className="text-ev-subtle text-xs mt-2 font-mono">{ELECTRICIAN_SUPPORT_EMAIL}</p>
        </div>
      </div>
    </ElectricianShell>
  );
}
