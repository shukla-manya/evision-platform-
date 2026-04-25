'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { electricianApi } from '@/lib/api';
import { ElectricianShell } from '@/components/electrician/ElectricianShell';
import { connectTrackingSocket, disconnectTrackingSocket, emitElectricianLocation, joinBookingRoom, onBookingLocationUpdate } from '@/lib/electrician-tracking';
import { getToken } from '@/lib/auth';

function mapEmbedUrl(lat: number, lng: number) {
  const delta = 0.01;
  const left = lng - delta;
  const right = lng + delta;
  const top = lat + delta;
  const bottom = lat - delta;
  return `https://www.openstreetmap.org/export/embed.html?bbox=${left}%2C${bottom}%2C${right}%2C${top}&layer=mapnik&marker=${lat}%2C${lng}`;
}

export default function ElectricianBookingDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const bookingId = String(params.id || '');
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState<any | null>(null);
  const [busyAction, setBusyAction] = useState('');
  const [liveCoords, setLiveCoords] = useState<{ lat: number; lng: number } | null>(null);

  const reload = async () => {
    try {
      setLoading(true);
      const { data } = await electricianApi.myBookings();
      const all = Array.isArray(data) ? data : [];
      const row = all.find((b: any) => String(b.id) === bookingId) || null;
      setBooking(row);
    } catch {
      toast.error('Failed to load booking details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void reload();
  }, [bookingId]);

  useEffect(() => {
    if (!booking || String(booking.job_status || '') !== 'on_the_way') return;
    const token = getToken();
    if (!token) return;
    connectTrackingSocket(token);
    joinBookingRoom(String(booking.id));
    const off = onBookingLocationUpdate((payload) => {
      if (String(payload.booking_id) !== String(booking.id)) return;
      setLiveCoords({ lat: Number(payload.lat), lng: Number(payload.lng) });
    });

    const timer = setInterval(() => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          emitElectricianLocation(String(booking.id), pos.coords.latitude, pos.coords.longitude);
        },
        () => {
          // Non-blocking: keep trying.
        },
      );
    }, 5000);
    return () => {
      off();
      clearInterval(timer);
      disconnectTrackingSocket();
    };
  }, [booking?.id, booking?.job_status]);

  const status = useMemo(() => String(booking?.job_status || booking?.status || '-'), [booking?.job_status, booking?.status]);

  const respond = async (action: 'accept' | 'decline') => {
    try {
      setBusyAction(action);
      await electricianApi.respondBooking(bookingId, action);
      toast.success(`Booking ${action}ed`);
      await reload();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Unable to update booking');
    } finally {
      setBusyAction('');
    }
  };

  const updateStatus = async (nextStatus: 'on_the_way' | 'reached' | 'work_started' | 'completed') => {
    try {
      setBusyAction(nextStatus);
      await electricianApi.updateJobStatus(bookingId, nextStatus);
      toast.success('Status updated');
      await reload();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Unable to update status');
    } finally {
      setBusyAction('');
    }
  };

  return (
    <ElectricianShell>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-ev-text">Booking Detail</h1>
        <button type="button" onClick={() => router.back()} className="ev-btn-secondary py-2 px-3 text-sm">
          Back
        </button>
      </div>
      {loading ? (
        <div className="flex items-center gap-2 text-ev-muted"><Loader2 size={18} className="animate-spin" /> Loading...</div>
      ) : !booking ? (
        <div className="ev-card p-8 text-ev-muted">Booking not found.</div>
      ) : (
        <div className="space-y-4">
          <div className="ev-card p-5">
            <p className="text-ev-text font-semibold">Booking #{String(booking.id).slice(0, 8)}</p>
            <p className="text-ev-subtle text-sm">Request: {String(booking.request_id || '-')}</p>
            <p className="text-ev-subtle text-sm">Customer: {String(booking.customer_id || '-')}</p>
            <p className="text-ev-subtle text-sm">Current status: {status}</p>
          </div>

          <div className="ev-card p-5 space-y-3">
            <h2 className="text-ev-text font-semibold">Actions</h2>
            <div className="flex flex-wrap gap-2">
              <button type="button" className="ev-btn-primary py-2 px-3 text-sm" onClick={() => void respond('accept')} disabled={!!busyAction}>
                {busyAction === 'accept' ? 'Please wait...' : 'Accept'}
              </button>
              <button type="button" className="ev-btn-secondary py-2 px-3 text-sm" onClick={() => void respond('decline')} disabled={!!busyAction}>
                {busyAction === 'decline' ? 'Please wait...' : 'Decline'}
              </button>
              {(['on_the_way', 'reached', 'work_started', 'completed'] as const).map((s) => (
                <button key={s} type="button" className="ev-btn-secondary py-2 px-3 text-sm" onClick={() => void updateStatus(s)} disabled={!!busyAction}>
                  {busyAction === s ? 'Please wait...' : s}
                </button>
              ))}
              <Link href={`/electrician/jobs/${bookingId}/upload-photo`} className="ev-btn-primary py-2 px-3 text-sm">
                Upload completion photo
              </Link>
            </div>
          </div>

          <div className="ev-card p-5">
            <h2 className="text-ev-text font-semibold mb-2">Live Tracking Map</h2>
            <p className="text-ev-subtle text-sm mb-3">Location emits every 5s while status is on_the_way.</p>
            {liveCoords ? (
              <iframe
                title="live-tracking-map"
                src={mapEmbedUrl(liveCoords.lat, liveCoords.lng)}
                className="w-full h-80 rounded-xl border border-ev-border"
              />
            ) : (
              <div className="text-ev-muted text-sm">No live coordinates yet. Set status to on_the_way and allow location access.</div>
            )}
          </div>
        </div>
      )}
    </ElectricianShell>
  );
}
