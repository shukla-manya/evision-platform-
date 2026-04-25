'use client';

import { useEffect, useState } from 'react';
import { Store, Users, Mail, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { superadminApi } from '@/lib/api';
import { SuperadminShell } from '@/components/superadmin/SuperadminShell';

type AnalyticsSnapshot = {
  admins: { total: number; pending: number; approved: number; rejected: number; suspended: number };
  users: { total: number; customers: number; dealers: number };
  emails: { total: number; sent: number; failed: number };
  generated_at?: string;
};

export default function SuperadminAnalyticsPage() {
  const [analytics, setAnalytics] = useState<AnalyticsSnapshot | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    superadminApi
      .getAnalytics()
      .then((r) => setAnalytics(r.data as AnalyticsSnapshot))
      .catch(() => toast.error('Failed to load analytics'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <SuperadminShell>
      <main className="p-6 sm:p-10">
        <h1 className="text-2xl font-bold text-ev-text mb-1">Analytics</h1>
        <p className="text-ev-muted text-sm mb-8">
          Snapshot from DynamoDB
          {analytics?.generated_at ? ` · ${new Date(analytics.generated_at).toLocaleString()}` : ''}
        </p>

        {loading ? (
          <div className="flex items-center gap-2 text-ev-muted py-16">
            <Loader2 className="animate-spin text-ev-primary" size={24} />
            Loading…
          </div>
        ) : analytics ? (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {[
                { label: 'Total shops', value: analytics.admins.total, icon: Store, color: 'text-ev-primary', bg: 'bg-ev-primary/10' },
                { label: 'Pending', value: analytics.admins.pending, icon: Store, color: 'text-ev-warning', bg: 'bg-ev-warning/10' },
                { label: 'Total users', value: analytics.users.total, icon: Users, color: 'text-ev-success', bg: 'bg-ev-success/10' },
                { label: 'Emails sent', value: analytics.emails.sent, icon: Mail, color: 'text-ev-primary-light', bg: 'bg-ev-primary/10' },
              ].map(({ label, value, icon: Icon, color, bg }) => (
                <div key={label} className="ev-card p-6">
                  <div className={`w-10 h-10 ${bg} rounded-xl flex items-center justify-center mb-3`}>
                    <Icon size={20} className={color} />
                  </div>
                  <p className="text-3xl font-bold text-ev-text">{value}</p>
                  <p className="text-ev-muted text-sm mt-1">{label}</p>
                </div>
              ))}
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="ev-card p-6">
                <h3 className="text-ev-text font-semibold mb-4 flex items-center gap-2">
                  <Store size={16} className="text-ev-primary" />
                  Shop admins
                </h3>
                {[
                  { label: 'Approved', val: analytics.admins.approved, color: 'bg-ev-success' },
                  { label: 'Pending', val: analytics.admins.pending, color: 'bg-ev-warning' },
                  { label: 'Rejected', val: analytics.admins.rejected, color: 'bg-ev-error' },
                  { label: 'Suspended', val: analytics.admins.suspended, color: 'bg-ev-subtle' },
                ].map(({ label, val, color }) => (
                  <div key={label} className="flex items-center justify-between py-2 border-b border-ev-border last:border-0">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${color}`} />
                      <span className="text-ev-muted text-sm">{label}</span>
                    </div>
                    <span className="text-ev-text font-semibold">{val}</span>
                  </div>
                ))}
              </div>
              <div className="ev-card p-6">
                <h3 className="text-ev-text font-semibold mb-4 flex items-center gap-2">
                  <Users size={16} className="text-ev-primary" />
                  Users & email
                </h3>
                {[
                  { label: 'Customers', val: analytics.users.customers, color: 'bg-ev-primary' },
                  { label: 'Dealers', val: analytics.users.dealers, color: 'bg-ev-accent' },
                ].map(({ label, val, color }) => (
                  <div key={label} className="flex items-center justify-between py-2 border-b border-ev-border last:border-0">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${color}`} />
                      <span className="text-ev-muted text-sm">{label}</span>
                    </div>
                    <span className="text-ev-text font-semibold">{val}</span>
                  </div>
                ))}
                <div className="flex items-center justify-between py-2 mt-2">
                  <span className="text-ev-muted text-sm">Email failures</span>
                  <span className={`font-semibold ${analytics.emails.failed > 0 ? 'text-ev-error' : 'text-ev-success'}`}>
                    {analytics.emails.failed}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-ev-muted text-sm">Total email logs</span>
                  <span className="text-ev-text font-semibold">{analytics.emails.total}</span>
                </div>
              </div>
            </div>
          </>
        ) : null}
      </main>
    </SuperadminShell>
  );
}
