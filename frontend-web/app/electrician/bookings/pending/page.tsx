'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { electricianApi } from '@/lib/api';
import { ElectricianShell } from '@/components/electrician/ElectricianShell';

export default function ElectricianPendingBookingsPage() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const { data } = await electricianApi.pendingBookings();
        setRows(Array.isArray(data) ? data : []);
      } catch {
        toast.error('Failed to load pending bookings');
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  return (
    <ElectricianShell>
      <h1 className="text-2xl font-bold text-ev-text mb-4">Pending Bookings</h1>
      {loading ? (
        <div className="flex items-center gap-2 text-ev-muted"><Loader2 size={18} className="animate-spin" /> Loading...</div>
      ) : rows.length === 0 ? (
        <div className="ev-card p-8 text-ev-muted">No pending bookings.</div>
      ) : (
        <div className="space-y-3">
          {rows.map((b) => (
            <Link key={b.id} href={`/electrician/bookings/${b.id}`} className="ev-card p-5 block hover:bg-ev-surface2/40">
              <p className="text-ev-text font-semibold">Booking #{String(b.id).slice(0, 8)}</p>
              <p className="text-ev-subtle text-sm">Status: {String(b.status || '-')}</p>
              <p className="text-ev-subtle text-sm">Created: {String(b.created_at || '-')}</p>
            </Link>
          ))}
        </div>
      )}
    </ElectricianShell>
  );
}
