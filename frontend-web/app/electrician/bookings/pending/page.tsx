'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Loader2, MapPin } from 'lucide-react';
import toast from 'react-hot-toast';
import { electricianApi } from '@/lib/api';
import { getApiErrorMessage } from '@/lib/api-errors';
import { ElectricianShell } from '@/components/electrician/ElectricianShell';
import { cleanText, formatCountdown, formatRequestedDate, formatTimeWindow } from '@/lib/electrician-ui';

type BookingRow = {
  id: string;
  status?: string;
  expires_at?: string;
  customer_name?: string;
  issue?: string;
  product_name?: string;
  service_address?: string;
  distance_km?: number;
  preferred_date?: string;
  time_from?: string;
  time_to?: string;
  created_at?: string;
};

export default function ElectricianPendingBookingsPage() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<BookingRow[]>([]);
  const [busyId, setBusyId] = useState('');
  const [declineId, setDeclineId] = useState<string | null>(null);
  const [nowTick, setNowTick] = useState(0);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await electricianApi.pendingBookings();
      setRows(Array.isArray(data) ? (data as BookingRow[]) : []);
    } catch {
      toast.error('Failed to load booking requests');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const t = setInterval(() => setNowTick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, []);

  void nowTick;

  async function respond(bookingId: string, action: 'accept' | 'decline') {
    try {
      setBusyId(`${bookingId}:${action}`);
      await electricianApi.respondBooking(bookingId, action);
      toast.success(action === 'accept' ? 'Booking accepted' : 'Booking declined');
      setDeclineId(null);
      await load();
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Could not update booking'));
    } finally {
      setBusyId('');
    }
  }

  return (
    <ElectricianShell>
      <div className="max-w-2xl mx-auto space-y-4">
        <h1 className="text-2xl font-bold text-ev-text">Booking requests</h1>

        {loading ? (
          <div className="flex items-center gap-2 text-ev-muted py-12">
            <Loader2 size={20} className="animate-spin text-ev-primary" />
            Loading…
          </div>
        ) : rows.length === 0 ? (
          <div className="ev-card p-8 text-center text-ev-muted text-sm leading-relaxed">
            No pending requests right now. Stay online to receive job requests.
          </div>
        ) : (
          <div className="space-y-4">
            {rows.map((b) => {
              const expiredBooking = String(b.status || '').toLowerCase() === 'expired';
              const countdown = formatCountdown(b.expires_at);
              const isExpired = expiredBooking || countdown === 'Expired';
              const customer = cleanText(b.customer_name, 'Customer');
              const issue = cleanText(b.issue, '—');
              const product = cleanText(b.product_name, '—');
              const address = cleanText(b.service_address, 'Address on file');
              const dist =
                b.distance_km != null && Number.isFinite(Number(b.distance_km))
                  ? `${Number(b.distance_km).toFixed(1)} km`
                  : '—';
              const requestedDate = b.preferred_date
                ? formatRequestedDate(b.preferred_date)
                : b.created_at
                  ? formatRequestedDate(b.created_at)
                  : '—';
              const windowLine = formatTimeWindow(null, b.time_from, b.time_to);

              return (
                <article key={b.id} className="ev-card p-5 space-y-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <p className="text-ev-text font-semibold">{customer}</p>
                    {!isExpired ? (
                      <p className="text-ev-warning text-xs font-semibold whitespace-nowrap">
                        Time left: {countdown}
                      </p>
                    ) : (
                      <p className="text-ev-error text-xs font-semibold">Expired</p>
                    )}
                  </div>
                  <p className="text-ev-text text-sm">
                    <span className="text-ev-muted">Issue: </span>
                    {issue}
                  </p>
                  <p className="text-ev-text text-sm">
                    <span className="text-ev-muted">Product: </span>
                    {product}
                  </p>
                  <p className="text-ev-muted text-sm inline-flex items-start gap-1.5">
                    <MapPin size={14} className="shrink-0 mt-0.5" />
                    <span>{address}</span>
                  </p>
                  <p className="text-ev-muted text-xs">
                    Distance: {dist} · Requested date: {requestedDate} · Time window: {windowLine}
                  </p>

                  {isExpired ? (
                    <p className="text-ev-error text-sm bg-ev-error/5 border border-ev-error/20 rounded-lg px-3 py-2">
                      This booking request has expired. The customer has been notified.
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => void respond(b.id, 'accept')}
                        disabled={!!busyId}
                        className="ev-btn-primary text-sm py-2 px-4 bg-ev-success hover:opacity-95 border-0 disabled:opacity-50"
                      >
                        {busyId === `${b.id}:accept` ? 'Working…' : 'Accept booking'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeclineId(b.id)}
                        disabled={!!busyId}
                        className="ev-btn-secondary text-sm py-2 px-4 disabled:opacity-50"
                      >
                        Decline
                      </button>
                      <Link
                        href={`/electrician/bookings/${b.id}`}
                        className="ev-btn-secondary text-sm py-2 px-4 inline-flex items-center"
                      >
                        Details
                      </Link>
                    </div>
                  )}

                  {declineId === b.id ? (
                    <div className="rounded-xl border border-ev-border bg-ev-surface2 p-4 space-y-3">
                      <p className="text-ev-text text-sm">
                        Are you sure you want to decline? The customer will be notified to choose another technician.
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          className="ev-btn-secondary text-sm py-1.5 px-3"
                          onClick={() => setDeclineId(null)}
                          disabled={!!busyId}
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          className="ev-btn-primary text-sm py-1.5 px-3 bg-ev-muted"
                          onClick={() => void respond(b.id, 'decline')}
                          disabled={!!busyId}
                        >
                          {busyId === `${b.id}:decline` ? 'Working…' : 'Yes, decline'}
                        </button>
                      </div>
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        )}
      </div>
    </ElectricianShell>
  );
}
