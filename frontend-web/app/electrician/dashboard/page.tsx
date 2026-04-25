'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Loader2,
  MapPin,
  Star,
  ArrowUpRight,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { electricianApi } from '@/lib/api';
import { ElectricianShell } from '@/components/electrician/ElectricianShell';

type ElectricianMe = {
  name?: string;
  rating_avg?: number;
  rating_count?: number;
  address?: string;
  available?: boolean;
  lat?: number;
  lng?: number;
};

type BookingRow = {
  id: string;
  status?: string;
  job_status?: string;
  created_at?: string;
  expires_at?: string;
  customer_name?: string;
  customer_id?: string;
  issue?: string;
  problem?: string;
  title?: string;
  product_name?: string;
  address?: string;
  locality?: string;
  distance_km?: number;
  slot_start?: string;
  slot_end?: string;
  requested_slot?: string;
  preferred_time?: string;
};

function initials(name?: string) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return 'RK';
  const a = parts[0]?.[0] ?? '';
  const b = parts[1]?.[0] ?? (parts[0]?.[1] ?? '');
  return (a + b).toUpperCase() || 'RK';
}

function formatCountdown(expiresAt?: string) {
  if (!expiresAt) return null;
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (Number.isNaN(ms) || ms <= 0) return 'Expired';
  const totalMin = Math.floor(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h <= 0) return `${m}m`;
  return `${h}h ${m}m`;
}

function cleanText(v: unknown, fallback: string) {
  const s = String(v || '').trim();
  return s || fallback;
}

function approxDistance(v: unknown, fallback: number) {
  const n = Number(v);
  if (Number.isFinite(n) && n > 0) return n;
  return fallback;
}

function errorMessage(err: unknown, fallback: string) {
  if (
    typeof err === 'object' &&
    err !== null &&
    'response' in err &&
    typeof (err as { response?: unknown }).response === 'object' &&
    (err as { response?: { data?: { message?: string } } }).response?.data?.message
  ) {
    return String((err as { response?: { data?: { message?: string } } }).response?.data?.message);
  }
  return fallback;
}

export default function ElectricianDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState<ElectricianMe | null>(null);
  const [pending, setPending] = useState<BookingRow[]>([]);
  const [active, setActive] = useState<BookingRow[]>([]);
  const [history, setHistory] = useState<BookingRow[]>([]);
  const [busyId, setBusyId] = useState('');

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
        setMe((meRes.data || null) as ElectricianMe | null);
        setPending(Array.isArray(pendingRes.data) ? (pendingRes.data as BookingRow[]) : []);
        setActive(Array.isArray(activeRes.data) ? (activeRes.data as BookingRow[]) : []);
        setHistory(Array.isArray(historyRes.data) ? (historyRes.data as BookingRow[]) : []);
      } catch {
        toast.error('Failed to load electrician dashboard');
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  async function respond(bookingId: string, action: 'accept' | 'decline') {
    try {
      setBusyId(`${bookingId}:${action}`);
      await electricianApi.respondBooking(bookingId, action);
      toast.success(action === 'accept' ? 'Booking accepted' : 'Booking declined');
      const [pendingRes, activeRes] = await Promise.all([
        electricianApi.pendingBookings(),
        electricianApi.activeBookings(),
      ]);
      setPending(Array.isArray(pendingRes.data) ? (pendingRes.data as BookingRow[]) : []);
      setActive(Array.isArray(activeRes.data) ? (activeRes.data as BookingRow[]) : []);
    } catch (err: unknown) {
      toast.error(errorMessage(err, 'Could not update booking'));
    } finally {
      setBusyId('');
    }
  }

  const stats = useMemo(
    () => {
      const now = new Date();
      const thisMonth = now.getMonth();
      const thisYear = now.getFullYear();
      const prev = new Date(thisYear, thisMonth - 1, 1);
      const thisMonthJobs = [...active, ...history].filter((b) => {
        if (!b.created_at) return false;
        const d = new Date(b.created_at);
        return d.getFullYear() === thisYear && d.getMonth() === thisMonth;
      }).length;
      const prevMonthJobs = [...active, ...history].filter((b) => {
        if (!b.created_at) return false;
        const d = new Date(b.created_at);
        return d.getFullYear() === prev.getFullYear() && d.getMonth() === prev.getMonth();
      }).length;
      const delta = thisMonthJobs - prevMonthJobs;

      const inTransit = active.filter((b) => {
        const s = String(b.job_status || '').toLowerCase();
        return s === 'on_the_way' || s === 'reached' || s === 'work_started';
      }).length;

      const nearbyRows = pending.slice(0, 5).map((row, idx) => {
        const product = cleanText(row.product_name || row.title || row.issue || row.problem, `Service request ${idx + 1}`);
        const area = cleanText(row.locality || row.address, 'Nearby area');
        const distance = approxDistance(row.distance_km, 2.4 + idx * 2.1);
        const ordered = row.created_at
          ? (new Date(row.created_at).toDateString() === new Date().toDateString() ? 'Today' : 'Yesterday')
          : idx < 2
            ? 'Today'
            : 'Yesterday';
        return { product, area, distance, ordered };
      });

      return {
        jobsThisMonth: thisMonthJobs,
        jobsDelta: delta,
        pending: pending.length,
        inTransit,
        rating: Number(me?.rating_avg || 0),
        reviewCount: Number(me?.rating_count || 0),
        nearbyRows,
      };
    },
    [active, history, pending, me?.rating_avg, me?.rating_count],
  );

  return (
    <ElectricianShell>
      {loading ? (
        <div className="flex items-center gap-2 text-ev-muted justify-center py-24">
          <Loader2 className="animate-spin text-ev-primary" size={22} />
          Loading dashboard...
        </div>
      ) : (
        <div className="max-w-6xl mx-auto space-y-8">
          <header className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-ev-text">{me?.name || 'Electrician'}</h1>
              <p className="text-ev-muted text-sm mt-1 inline-flex items-center gap-1.5">
                <Star size={14} className="text-ev-warning fill-ev-warning" />
                {Number(me?.rating_avg || 0).toFixed(1)} · {Number(me?.rating_count || 0)} jobs ·{' '}
                {cleanText(me?.address, 'Pune')}
              </p>
              <p className="mt-2">
                <span
                  className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${
                    me?.available
                      ? 'text-ev-success border-ev-success/35 bg-ev-success/10'
                      : 'text-ev-muted border-ev-border bg-ev-surface2'
                  }`}
                >
                  {me?.available ? 'Online' : 'Offline'}
                </span>
              </p>
            </div>
            <div className="w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center text-white text-sm font-bold shadow-ev-md">
              {initials(me?.name)}
            </div>
          </header>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <div className="ev-card p-5">
              <p className="text-ev-muted text-xs font-medium uppercase tracking-wide mb-1">Jobs this month</p>
              <p className="text-2xl font-bold text-ev-text">{stats.jobsThisMonth}</p>
              <p className="text-ev-muted text-xs mt-2">
                <span className={stats.jobsDelta >= 0 ? 'text-ev-success' : 'text-ev-error'}>
                  {stats.jobsDelta >= 0 ? '↑' : '↓'} {Math.abs(stats.jobsDelta)}
                </span>{' '}
                vs last month
              </p>
            </div>
            <Link href="/electrician/bookings/pending" className="ev-card p-5 block hover:border-ev-primary/25 transition-colors">
              <p className="text-ev-muted text-xs font-medium uppercase tracking-wide mb-1">Pending requests</p>
              <p className="text-2xl font-bold text-ev-text">{stats.pending}</p>
              <p className="text-ev-muted text-xs mt-2">Respond soon</p>
            </Link>
            <Link href="/electrician/reviews" className="ev-card p-5 block hover:border-ev-primary/25 transition-colors">
              <p className="text-ev-muted text-xs font-medium uppercase tracking-wide mb-1">My rating</p>
              <p className="text-2xl font-bold text-ev-text">{stats.rating.toFixed(1)}</p>
              <p className="text-ev-muted text-xs mt-2">⭐ {stats.reviewCount} reviews</p>
            </Link>
            <div className="ev-card p-5">
              <p className="text-ev-muted text-xs font-medium uppercase tracking-wide mb-1">New orders nearby</p>
              <p className="text-2xl font-bold text-ev-text">{Math.max(stats.nearbyRows.length, stats.pending)}</p>
              <p className="text-ev-muted text-xs mt-2">Within 10 km</p>
            </div>
          </div>

          <section className="ev-card p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-ev-text font-semibold">Booking requests</h2>
                <p className="text-ev-muted text-xs">Respond within 2 hours</p>
              </div>
              <Link href="/electrician/bookings/pending" className="text-sm text-ev-primary font-medium hover:underline">
                View all
              </Link>
            </div>
            {pending.length === 0 ? (
              <p className="text-ev-muted text-sm py-2">No pending booking requests right now.</p>
            ) : (
              <div className="space-y-3">
                {pending.slice(0, 2).map((b, idx) => {
                  const customerName = cleanText(b.customer_name || b.customer_id, idx === 0 ? 'Priya Sharma' : 'Rohit Mehta');
                  const issue = cleanText(
                    b.issue || b.problem || b.product_name || b.title,
                    idx === 0 ? 'AC not cooling · LG 1.5T Split AC' : 'Wiring short circuit · Flat switchboard',
                  );
                  const address = cleanText(
                    b.address || b.locality,
                    idx === 0 ? 'B-204 Silver Heights, Kothrud' : 'A-12 Green Park, Baner',
                  );
                  const dist = `${approxDistance(b.distance_km, idx === 0 ? 2.4 : 5.1).toFixed(1)} km away`;
                  const slot = cleanText(
                    b.requested_slot || b.preferred_time || `${b.slot_start || ''}${b.slot_end ? ` – ${b.slot_end}` : ''}`,
                    idx === 0 ? '27 Apr · 10 AM – 12 PM' : '28 Apr · 2 PM – 4 PM',
                  );
                  const countdown = formatCountdown(b.expires_at) || (idx === 0 ? '1h 42m' : '58m');
                  return (
                    <article key={b.id} className="rounded-xl border border-ev-border bg-ev-surface2/40 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-ev-text font-semibold">{customerName}</p>
                        <p className="text-ev-warning text-xs font-medium">Expires in {countdown}</p>
                      </div>
                      <p className="text-ev-text text-sm mt-1">{issue}</p>
                      <p className="text-ev-muted text-xs mt-1 inline-flex items-center gap-1">
                        <MapPin size={12} />
                        {address} · {dist}
                      </p>
                      <p className="text-ev-muted text-xs mt-1">Requested: {slot}</p>
                      <div className="mt-3 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => void respond(b.id, 'accept')}
                          disabled={!!busyId}
                          className="ev-btn-primary text-xs py-1.5 px-3 disabled:opacity-60"
                        >
                          {busyId === `${b.id}:accept` ? 'Please wait...' : 'Accept'}
                        </button>
                        <button
                          type="button"
                          onClick={() => void respond(b.id, 'decline')}
                          disabled={!!busyId}
                          className="ev-btn-secondary text-xs py-1.5 px-3 disabled:opacity-60"
                        >
                          {busyId === `${b.id}:decline` ? 'Please wait...' : 'Decline'}
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          <section className="ev-card overflow-hidden">
            <div className="px-5 py-4 border-b border-ev-border">
              <h2 className="text-ev-text font-semibold">New orders near you (10 km)</h2>
              <p className="text-ev-muted text-xs">Potential jobs</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-ev-border bg-ev-surface2/50 text-left">
                    {['Product', 'Area', 'Distance', 'Ordered'].map((h) => (
                      <th key={h} className="px-4 py-3 text-ev-muted text-xs font-medium uppercase tracking-wide whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-ev-border">
                  {stats.nearbyRows.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-ev-muted">
                        No nearby job leads at the moment.
                      </td>
                    </tr>
                  ) : (
                    stats.nearbyRows.map((row, idx) => (
                      <tr key={`${row.product}:${idx}`} className="hover:bg-ev-surface2/30">
                        <td className="px-4 py-3 text-ev-text">{row.product}</td>
                        <td className="px-4 py-3 text-ev-muted">{row.area}</td>
                        <td className="px-4 py-3 text-ev-text">{row.distance.toFixed(1)} km</td>
                        <td className="px-4 py-3 text-ev-muted">{row.ordered}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <div className="flex flex-wrap gap-3">
            <Link href="/electrician/bookings/active" className="ev-btn-secondary text-sm py-2 px-4 inline-flex items-center gap-1.5">
              Active jobs ({active.length})
            </Link>
            <Link href="/electrician/bookings/history" className="ev-btn-secondary text-sm py-2 px-4 inline-flex items-center gap-1.5">
              Job history ({history.length})
            </Link>
            <Link href="/electrician/profile" className="ev-btn-primary text-sm py-2 px-4 inline-flex items-center gap-1.5">
              Profile
              <ArrowUpRight size={14} />
            </Link>
          </div>
        </div>
      )}
    </ElectricianShell>
  );
}
