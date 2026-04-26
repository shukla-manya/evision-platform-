'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft, Loader2, MapPin, Star } from 'lucide-react';
import toast from 'react-hot-toast';
import { serviceApi, technicianDirectoryApi } from '@/lib/api';
import { getRole } from '@/lib/auth';
import { PublicShell } from '@/components/public/PublicShell';

type Electrician = {
  id: string;
  name?: string;
  photo_url?: string;
  rating_avg?: number;
  rating_count?: number;
  total_reviews?: number;
  distance_km?: number;
  skills?: string[] | string;
};

function skillsLabel(s: Electrician['skills']) {
  if (Array.isArray(s)) return s.join(' · ');
  if (typeof s === 'string') return s.replace(/,/g, ' · ');
  return '—';
}

function TechniciansInner() {
  const sp = useSearchParams();
  const requestId = sp.get('request_id') || '';
  const lat = Number(sp.get('lat') || '12.9716');
  const lng = Number(sp.get('lng') || '77.5946');

  const role = typeof window !== 'undefined' ? getRole() : undefined;
  const ok = role === 'customer' || role === 'dealer';

  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Electrician[]>([]);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [bookingName, setBookingName] = useState<string>('');
  const [bookingStatus, setBookingStatus] = useState<string | null>(null);
  const [bookingDetail, setBookingDetail] = useState<Record<string, unknown> | null>(null);
  const [booking, setBooking] = useState(false);

  const loadNearby = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await technicianDirectoryApi.nearby(lat, lng);
      setRows(Array.isArray(data) ? (data as Electrician[]) : []);
    } catch {
      toast.error('Could not load technicians');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [lat, lng]);

  useEffect(() => {
    if (!ok || !requestId) return;
    void loadNearby();
  }, [ok, requestId, loadNearby]);

  useEffect(() => {
    if (!bookingId || !ok) return;
    let cancelled = false;
    const tick = async () => {
      try {
        const { data } = await serviceApi.getBooking(bookingId);
        if (cancelled) return;
        setBookingDetail(data as Record<string, unknown>);
        const b = (data as { booking?: { status?: string } })?.booking;
        setBookingStatus(String(b?.status || ''));
      } catch {
        /* ignore */
      }
    };
    void tick();
    const iv = setInterval(() => void tick(), 5000);
    return () => {
      cancelled = true;
      clearInterval(iv);
    };
  }, [bookingId, ok]);

  const statusMessage = useMemo(() => {
    if (!bookingId || !bookingDetail) return null;
    const b = bookingDetail.booking as { status?: string; electrician_id?: string } | undefined;
    const req = bookingDetail.request as {
      preferred_date?: string;
      time_from?: string;
      time_to?: string;
    } | null;
    const el = bookingDetail.electrician as { name?: string; phone?: string } | null;
    const name = String(el?.name || bookingName || 'Technician');
    const st = String(b?.status || bookingStatus || '');
    if (st === 'pending') {
      return `Booking request sent to ${name}. They have 2 hours to confirm. You'll get a notification once accepted.`;
    }
    if (st === 'declined') {
      return `${name} is unavailable for this slot. Choose another technician from the list.`;
    }
    if (st === 'accepted') {
      const when = req?.preferred_date
        ? `${req.preferred_date} between ${req.time_from || '—'} and ${req.time_to || '—'}`
        : 'your preferred slot';
      const phone = el?.phone ? String(el.phone) : '—';
      return `Booking confirmed! ${name} will visit on ${when}. Contact: ${phone.startsWith('+') ? phone : `+91 ${phone}`}`;
    }
    return null;
  }, [bookingId, bookingDetail, bookingName, bookingStatus]);

  async function bookTech(e: Electrician) {
    if (!requestId) {
      toast.error('Missing service request');
      return;
    }
    setBooking(true);
    try {
      const { data } = await serviceApi.bookElectrician(e.id, requestId);
      const bid = String((data as { id?: string })?.id || '');
      if (!bid) throw new Error('no booking');
      setBookingId(bid);
      setBookingName(String(e.name || 'Technician'));
      setBookingStatus('pending');
      toast.success('Booking request sent');
    } catch {
      toast.error('Could not send booking');
    } finally {
      setBooking(false);
    }
  }

  if (!ok) {
    return (
      <main className="max-w-lg mx-auto px-4 py-16 text-center">
        <Link href="/login" className="ev-btn-primary">
          Sign in
        </Link>
      </main>
    );
  }

  if (!requestId) {
    return (
      <main className="max-w-lg mx-auto px-4 py-16 text-center text-ev-muted">
        <p className="text-ev-text font-medium mb-2">Start from a service request</p>
        <Link href="/service/request" className="ev-btn-primary inline-flex mt-4">
          Tell us about the issue
        </Link>
      </main>
    );
  }

  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <Link href="/service/request" className="ev-btn-secondary text-sm py-2 px-3 inline-flex items-center gap-1.5 mb-6">
        <ArrowLeft size={14} /> Back
      </Link>
      <div className="flex items-start gap-2 mb-2">
        <MapPin className="text-ev-primary shrink-0 mt-1" size={20} />
        <div>
          <h1 className="text-2xl font-bold text-ev-text">Available technicians near you</h1>
          <p className="text-ev-muted text-sm mt-1">
            Sorted by rating. All within 10 km of your address.
          </p>
        </div>
      </div>

      {statusMessage ? (
        <div className="ev-card p-4 mb-6 text-sm text-ev-text leading-relaxed border-ev-primary/25 bg-ev-primary/5">
          {statusMessage}
          <div className="mt-3 flex flex-wrap gap-3">
            {bookingStatus === 'accepted' && bookingDetail?.electrician ? (
              <Link
                href={`/service/review?electricianId=${encodeURIComponent(String((bookingDetail.electrician as { id?: string }).id || ''))}&name=${encodeURIComponent(String((bookingDetail.electrician as { name?: string }).name || 'Technician'))}`}
                className="ev-btn-primary text-sm py-2 px-4 inline-flex"
              >
                Leave a review
              </Link>
            ) : null}
            {bookingStatus === 'declined' || bookingStatus === 'accepted' ? (
              <Link href="/orders" className="ev-btn-secondary text-sm py-2 px-4 inline-flex">
                Back to orders
              </Link>
            ) : null}
          </div>
        </div>
      ) : null}

      {loading ? (
        <div className="flex justify-center py-16 text-ev-muted gap-2">
          <Loader2 className="animate-spin text-ev-primary" size={22} /> Finding technicians…
        </div>
      ) : rows.length === 0 ? (
        <div className="ev-card p-10 text-center text-ev-muted text-sm">
          No technicians available within 10 km right now. Try again later or expand your time window.
        </div>
      ) : (
        <ul className="space-y-4">
          {rows.map((e) => {
            const reviews = Number(e.total_reviews ?? e.rating_count ?? 0);
            const rating = Number(e.rating_avg || 0);
            const lockActions = bookingStatus === 'pending' || bookingStatus === 'accepted';
            return (
              <li key={e.id} className="ev-card p-5 flex flex-col sm:flex-row gap-4">
                <div className="w-16 h-16 rounded-xl overflow-hidden border border-ev-border shrink-0 bg-ev-surface2">
                  {e.photo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={e.photo_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-ev-subtle text-xs">No photo</div>
                  )}
                </div>
                <div className="flex-1 min-w-0 space-y-1">
                  <p className="font-semibold text-ev-text">{e.name || 'Technician'}</p>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ev-muted">
                    <span className="inline-flex items-center gap-1 text-ev-warning">
                      <Star size={14} className="fill-ev-warning" />
                      {rating.toFixed(1)} · {reviews} reviews
                    </span>
                    <span>{e.distance_km != null ? `${e.distance_km} km` : '—'}</span>
                  </div>
                  <p className="text-xs text-ev-muted">
                    <span className="text-ev-text font-medium">Skills:</span> {skillsLabel(e.skills)}
                  </p>
                  <p className="text-xs text-ev-muted">
                    <span className="text-ev-text font-medium">Jobs done:</span> {reviews > 0 ? `${reviews}+` : 'New'}
                  </p>
                </div>
                <div className="shrink-0 flex items-center">
                  <button
                    type="button"
                    disabled={booking || lockActions}
                    onClick={() => void bookTech(e)}
                    className="ev-btn-primary text-sm py-2 px-4 w-full sm:w-auto disabled:opacity-50"
                  >
                    {booking ? <Loader2 size={16} className="animate-spin" /> : 'Book'}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}

export default function TechniciansNearPage() {
  return (
    <PublicShell>
      <Suspense
        fallback={
          <div className="flex justify-center py-24 text-ev-muted gap-2">
            <Loader2 className="animate-spin text-ev-primary" size={22} /> Loading…
          </div>
        }
      >
        <TechniciansInner />
      </Suspense>
    </PublicShell>
  );
}
