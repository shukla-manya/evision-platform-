'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { electricianApi } from '@/lib/api';
import { getApiErrorMessage } from '@/lib/api-errors';
import { ElectricianShell } from '@/components/electrician/ElectricianShell';
import { cleanText } from '@/lib/electrician-ui';

type ElectricianMe = {
  name?: string;
  rating_avg?: number;
  rating_count?: number;
  address?: string;
  available?: boolean;
};

type BookingRow = {
  id: string;
  status?: string;
  created_at?: string;
  expires_at?: string;
  customer_name?: string;
  issue?: string;
  product_name?: string;
  service_address?: string;
  locality?: string;
  distance_km?: number;
  preferred_date?: string;
  time_from?: string;
  time_to?: string;
};

export default function ElectricianDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState<ElectricianMe | null>(null);
  const [pending, setPending] = useState<BookingRow[]>([]);
  const [historyCount, setHistoryCount] = useState(0);
  const [toggling, setToggling] = useState(false);
  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [meRes, pendingRes, historyRes] = await Promise.all([
        electricianApi.me(),
        electricianApi.pendingBookings(),
        electricianApi.historyBookings(),
      ]);
      setMe((meRes.data || null) as ElectricianMe | null);
      setPending(Array.isArray(pendingRes.data) ? (pendingRes.data as BookingRow[]) : []);
      setHistoryCount(Array.isArray(historyRes.data) ? historyRes.data.length : 0);
    } catch {
      toast.error('Failed to load home');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function setOnline(next: boolean) {
    try {
      setToggling(true);
      await electricianApi.setAvailability(next);
      setMe((m) => (m ? { ...m, available: next } : m));
      toast.success(next ? 'You are now online' : 'You are now offline');
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Could not update availability'));
    } finally {
      setToggling(false);
    }
  }

  const nearbyLines = useMemo(() => {
    return pending.slice(0, 5).map((row, idx) => {
      const product = cleanText(row.product_name || row.issue, `Product ${idx + 1}`);
      const area = cleanText(row.service_address || row.locality, 'Nearby area');
      const dist = Number(row.distance_km);
      const km = Number.isFinite(dist) && dist > 0 ? dist : 2 + idx * 1.5;
      return { id: row.id, product, area, km };
    });
  }, [pending]);

  const displayName = cleanText(me?.name, 'there');
  const rating = Number(me?.rating_avg || 0).toFixed(1);
  const jobsDone = historyCount;

  return (
    <ElectricianShell>
      {loading ? (
        <div className="flex items-center gap-2 text-ev-muted justify-center py-24">
          <Loader2 className="animate-spin text-ev-primary" size={22} />
          Loading…
        </div>
      ) : (
        <div className="max-w-2xl mx-auto space-y-6">
          <header className="space-y-1">
            <h1 className="text-xl sm:text-2xl font-bold text-ev-text leading-snug">
              Hello {displayName} — <span className="text-ev-warning">⭐</span> {rating} · {jobsDone} jobs done
            </h1>
          </header>

          <div className="ev-card p-5 space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-ev-text font-medium">
                  {me?.available ? 'You are ONLINE' : 'You are OFFLINE'}
                </p>
                <p className="text-ev-muted text-sm mt-1">
                  {me?.available
                    ? 'Customers can find you. Toggle to go offline.'
                    : "You won't receive any job requests."}
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={Boolean(me?.available)}
                disabled={toggling}
                onClick={() => void setOnline(!me?.available)}
                className={`relative shrink-0 w-14 h-8 rounded-full transition-colors ${
                  me?.available ? 'bg-ev-success' : 'bg-ev-border'
                } ${toggling ? 'opacity-60' : ''}`}
              >
                <span
                  className={`absolute top-1 left-1 h-6 w-6 rounded-full bg-white shadow transition-transform ${
                    me?.available ? 'translate-x-6' : ''
                  }`}
                />
              </button>
            </div>
          </div>

          {pending.length > 0 ? (
            <Link
              href="/electrician/bookings/pending"
              className="block ev-card p-4 border-ev-warning/30 bg-ev-warning/5 hover:bg-ev-warning/10 transition-colors"
            >
              <p className="text-ev-text font-semibold text-sm">
                {pending.length} booking request{pending.length === 1 ? '' : 's'} waiting
              </p>
              <p className="text-ev-muted text-xs mt-1">Respond before they expire</p>
            </Link>
          ) : null}

          <section className="ev-card overflow-hidden">
            <div className="px-4 py-3 border-b border-ev-border bg-ev-surface2/50">
              <h2 className="text-ev-text font-semibold text-sm">Nearby orders</h2>
              <p className="text-ev-muted text-xs mt-0.5">New products ordered near you</p>
            </div>
            <ul className="divide-y divide-ev-border">
              {nearbyLines.length === 0 ? (
                <li className="px-4 py-8 text-ev-muted text-sm text-center">
                  No nearby leads right now. Stay online to receive job requests.
                </li>
              ) : (
                nearbyLines.map((line) => (
                  <li key={line.id} className="px-4 py-3 text-sm">
                    <span className="text-ev-text font-medium">{line.product}</span>
                    <span className="text-ev-muted"> ordered in </span>
                    <span className="text-ev-text">{line.area}</span>
                    <span className="text-ev-muted">, </span>
                    <span className="text-ev-text tabular-nums">{line.km.toFixed(1)} km away</span>
                    <span className="text-ev-muted"> · These customers may need service soon.</span>
                  </li>
                ))
              )}
            </ul>
          </section>

        </div>
      )}
    </ElectricianShell>
  );
}
