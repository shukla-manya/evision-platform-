'use client';

import { useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { electricianApi } from '@/lib/api';
import { ElectricianShell } from '@/components/electrician/ElectricianShell';

export default function ElectricianHistoryBookingsPage() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const { data } = await electricianApi.historyBookings();
        setRows(Array.isArray(data) ? data : []);
      } catch {
        toast.error('Failed to load history');
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const estimated = useMemo(() => rows.length * 500, [rows.length]);

  return (
    <ElectricianShell>
      <h1 className="text-2xl font-bold text-ev-text mb-4">Earnings & History</h1>
      <div className="ev-card p-5 mb-4">
        <p className="text-ev-subtle text-sm">Completed jobs: {rows.length}</p>
        <p className="text-ev-text font-semibold">Estimated earnings: Rs. {estimated}</p>
      </div>
      {loading ? (
        <div className="flex items-center gap-2 text-ev-muted"><Loader2 size={18} className="animate-spin" /> Loading...</div>
      ) : rows.length === 0 ? (
        <div className="ev-card p-8 text-ev-muted">No completed jobs yet.</div>
      ) : (
        <div className="space-y-3">
          {rows.map((b) => (
            <div key={b.id} className="ev-card p-5">
              <p className="text-ev-text font-semibold">Booking #{String(b.id).slice(0, 8)}</p>
              <p className="text-ev-subtle text-sm">Completed at: {String(b.updated_at || '-')}</p>
            </div>
          ))}
        </div>
      )}
    </ElectricianShell>
  );
}
