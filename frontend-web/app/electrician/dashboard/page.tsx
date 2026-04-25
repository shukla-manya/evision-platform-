'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { electricianApi } from '@/lib/api';
import { ElectricianShell } from '@/components/electrician/ElectricianShell';

export default function ElectricianDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState<any>(null);
  const [pending, setPending] = useState<any[]>([]);
  const [active, setActive] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [meRes, pendingRes, activeRes, historyRes] = await Promise.all([
          electricianApi.me(),
          electricianApi.pendingBookings(),
          electricianApi.activeBookings(),
          electricianApi.historyBookings(),
        ]);
        setMe(meRes.data);
        setPending(Array.isArray(pendingRes.data) ? pendingRes.data : []);
        setActive(Array.isArray(activeRes.data) ? activeRes.data : []);
        setHistory(Array.isArray(historyRes.data) ? historyRes.data : []);
      } catch {
        toast.error('Failed to load electrician dashboard');
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const stats = useMemo(
    () => ({
      pending: pending.length,
      active: active.length,
      completed: history.length,
      rating: Number(me?.rating_avg || 0).toFixed(1),
    }),
    [pending.length, active.length, history.length, me?.rating_avg],
  );

  return (
    <ElectricianShell>
      {loading ? (
        <div className="flex items-center gap-2 text-ev-muted justify-center py-24">
          <Loader2 className="animate-spin text-ev-primary" size={22} />
          Loading dashboard...
        </div>
      ) : (
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-ev-text">Electrician Dashboard</h1>
            <p className="text-ev-muted text-sm mt-1">
              Welcome {me?.name || 'Electrician'} · status: {me?.status || '-'}
            </p>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="ev-card p-4">
              <p className="text-ev-subtle text-xs">Pending</p>
              <p className="text-ev-text text-2xl font-bold">{stats.pending}</p>
            </div>
            <div className="ev-card p-4">
              <p className="text-ev-subtle text-xs">Active</p>
              <p className="text-ev-text text-2xl font-bold">{stats.active}</p>
            </div>
            <div className="ev-card p-4">
              <p className="text-ev-subtle text-xs">Completed</p>
              <p className="text-ev-text text-2xl font-bold">{stats.completed}</p>
            </div>
            <div className="ev-card p-4">
              <p className="text-ev-subtle text-xs">Rating</p>
              <p className="text-ev-text text-2xl font-bold">{stats.rating}</p>
            </div>
          </div>
          <div className="ev-card p-5">
            <h2 className="text-ev-text font-semibold mb-3">Quick actions</h2>
            <div className="flex flex-wrap gap-3">
              <Link href="/electrician/bookings/pending" className="ev-btn-secondary">Pending bookings</Link>
              <Link href="/electrician/bookings/active" className="ev-btn-secondary">Active jobs</Link>
              <Link href="/electrician/bookings/history" className="ev-btn-secondary">History</Link>
              <Link href="/electrician/profile" className="ev-btn-primary">Profile</Link>
            </div>
          </div>
        </div>
      )}
    </ElectricianShell>
  );
}
