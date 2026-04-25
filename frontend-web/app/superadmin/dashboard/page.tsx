'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Store, Users, Mail, BarChart3, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { superadminApi } from '@/lib/api';
import { SuperadminShell } from '@/components/superadmin/SuperadminShell';

type AnalyticsSnapshot = {
  admins: { total: number; pending: number; approved: number; rejected: number; suspended: number };
  users: { total: number; customers: number; dealers: number };
  emails: { total: number; sent: number; failed: number };
};

export default function SuperadminDashboardPage() {
  const [analytics, setAnalytics] = useState<AnalyticsSnapshot | null>(null);

  useEffect(() => {
    superadminApi
      .getAnalytics()
      .then((r) => setAnalytics(r.data as AnalyticsSnapshot))
      .catch(() => toast.error('Could not load overview'));
  }, []);

  return (
    <SuperadminShell>
      <main className="p-6 sm:p-10">
        <h1 className="text-2xl font-bold text-ev-text mb-1">Home</h1>
        <p className="text-ev-muted text-sm mb-10">Platform control centre — add more modules later from here.</p>

        {analytics ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
            {[
              { label: 'Shops (admins)', value: analytics.admins.total, icon: Store, href: '/superadmin/shops' },
              { label: 'Pending approval', value: analytics.admins.pending, icon: Store, href: '/superadmin/pending-admins' },
              { label: 'End users', value: analytics.users.total, icon: Users, href: '/superadmin/analytics' },
              { label: 'Emails sent', value: analytics.emails.sent, icon: Mail, href: '/superadmin/analytics' },
            ].map(({ label, value, icon: Icon, href }) => (
              <Link
                key={label}
                href={href}
                className="ev-card p-6 hover:border-ev-primary/30 transition-colors group block"
              >
                <Icon size={20} className="text-ev-primary mb-3" />
                <p className="text-3xl font-bold text-ev-text">{value}</p>
                <p className="text-ev-muted text-sm mt-1 flex items-center gap-1">
                  {label}
                  <ArrowRight size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                </p>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-ev-muted text-sm mb-10">Loading snapshot…</p>
        )}

        <div className="grid sm:grid-cols-2 gap-4">
          <Link href="/superadmin/pending-admins" className="ev-card p-6 flex items-center justify-between hover:border-ev-warning/40">
            <div>
              <h2 className="text-ev-text font-semibold">Pending admins</h2>
              <p className="text-ev-muted text-sm mt-1">Approve or reject new shop registrations</p>
            </div>
            <BarChart3 className="text-ev-warning shrink-0" size={28} />
          </Link>
          <Link href="/superadmin/analytics" className="ev-card p-6 flex items-center justify-between hover:border-ev-primary/40">
            <div>
              <h2 className="text-ev-text font-semibold">Analytics</h2>
              <p className="text-ev-muted text-sm mt-1">Users, shops, and email delivery</p>
            </div>
            <BarChart3 className="text-ev-primary shrink-0" size={28} />
          </Link>
        </div>
      </main>
    </SuperadminShell>
  );
}
