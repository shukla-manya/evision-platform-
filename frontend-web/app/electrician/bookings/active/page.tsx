'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Loader2, MapPin } from 'lucide-react';
import toast from 'react-hot-toast';
import { electricianApi } from '@/lib/api';
import { ElectricianShell } from '@/components/electrician/ElectricianShell';
import { cleanText } from '@/lib/electrician-ui';

type Row = {
  id: string;
  status?: string;
  job_status?: string;
  customer_name?: string;
  issue?: string;
  product_name?: string;
  service_address?: string;
};

export default function ElectricianActiveBookingsPage() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const { data } = await electricianApi.activeBookings();
        setRows(Array.isArray(data) ? (data as Row[]) : []);
      } catch {
        toast.error('Failed to load active jobs');
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  return (
    <ElectricianShell>
      <div className="w-full min-w-0 max-w-full space-y-4">
        <h1 className="text-2xl font-bold text-ev-text">Active job</h1>
        {loading ? (
          <div className="flex items-center gap-2 text-ev-muted py-12">
            <Loader2 size={20} className="animate-spin text-ev-primary" />
            Loading…
          </div>
        ) : rows.length === 0 ? (
          <div className="ev-card p-8 text-ev-muted text-sm text-center space-y-4">
            <p>You have no active job. Accept a booking request or open pending booking requests.</p>
            <Link href="/electrician/bookings/pending" className="ev-btn-secondary text-sm py-2.5 px-5 inline-flex justify-center">
              Booking requests
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {rows.map((b) => (
              <Link
                key={b.id}
                href={`/electrician/bookings/${b.id}`}
                className="ev-card p-5 block hover:border-ev-primary/30 transition-colors space-y-2"
              >
                <p className="text-ev-text font-semibold">{cleanText(b.customer_name, 'Customer')}</p>
                <p className="text-ev-muted text-sm">{cleanText(b.issue, 'Service job')}</p>
                <p className="text-ev-subtle text-xs inline-flex items-center gap-1">
                  <MapPin size={12} />
                  {cleanText(b.service_address, 'Open job for address')}
                </p>
                <p className="text-ev-primary text-xs font-medium">Continue job →</p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </ElectricianShell>
  );
}
