'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ExternalLink, Loader2, Phone } from 'lucide-react';
import toast from 'react-hot-toast';
import { electricianApi } from '@/lib/api';
import { getApiErrorMessage } from '@/lib/api-errors';
import { ElectricianShell } from '@/components/electrician/ElectricianShell';
import { cleanText, formatTimeWindow, googleMapsDirectionsUrl } from '@/lib/electrician-ui';
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

type Booking = {
  id: string;
  status?: string;
  job_status?: string | null;
  customer_name?: string;
  customer_phone?: string;
  issue?: string;
  product_name?: string;
  service_address?: string;
  preferred_date?: string;
  time_from?: string;
  time_to?: string;
  accepted_at?: string;
  work_photo_url?: string;
};

export default function ElectricianBookingDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const bookingId = String(params.id || '');
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState<Booking | null>(null);
  const [busyAction, setBusyAction] = useState('');
  const [liveCoords, setLiveCoords] = useState<{ lat: number; lng: number } | null>(null);

  const reload = useCallback(async () => {
    try {
      setLoading(true);
      const [p, a, h, mine] = await Promise.all([
        electricianApi.pendingBookings(),
        electricianApi.activeBookings(),
        electricianApi.historyBookings(),
        electricianApi.myBookings(),
      ]);
      const enriched = [
        ...(Array.isArray(p.data) ? p.data : []),
        ...(Array.isArray(a.data) ? a.data : []),
        ...(Array.isArray(h.data) ? h.data : []),
      ] as Booking[];
      let row = enriched.find((b) => String(b.id) === bookingId) || null;
      if (!row) {
        const raw = Array.isArray(mine.data) ? (mine.data as Booking[]) : [];
        row = raw.find((b) => String(b.id) === bookingId) || null;
      }
      setBooking(row);
    } catch {
      toast.error('Failed to load booking');
    } finally {
      setLoading(false);
    }
  }, [bookingId]);

  useEffect(() => {
    void reload();
  }, [reload]);

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
        () => {},
      );
    }, 5000);
    return () => {
      off();
      clearInterval(timer);
      disconnectTrackingSocket();
    };
  }, [booking?.id, booking?.job_status]);

  const respond = async (action: 'accept' | 'decline') => {
    try {
      setBusyAction(action);
      await electricianApi.respondBooking(bookingId, action);
      toast.success(action === 'accept' ? 'Booking accepted' : 'Booking declined');
      await reload();
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Unable to update booking'));
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
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Unable to update status'));
    } finally {
      setBusyAction('');
    }
  };

  const jobStatus = useMemo(() => String(booking?.job_status || ''), [booking?.job_status]);
  const bookingStatus = useMemo(() => String(booking?.status || ''), [booking?.status]);

  const address = cleanText(booking?.service_address, '');
  const mapsUrl = address ? googleMapsDirectionsUrl(address) : '';

  return (
    <ElectricianShell>
      <div className="w-full min-w-0 max-w-full space-y-4">
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-2xl font-bold text-ev-text">
            {!booking
              ? 'Job'
              : String(booking.status || '') === 'pending'
                ? 'Booking request'
                : 'Active job'}
          </h1>
          <button type="button" onClick={() => router.back()} className="ev-btn-secondary py-2 px-3 text-sm shrink-0">
            Back
          </button>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-ev-muted py-12">
            <Loader2 size={20} className="animate-spin text-ev-primary" />
            Loading…
          </div>
        ) : !booking ? (
          <div className="ev-card p-8 text-ev-muted text-sm">Booking not found.</div>
        ) : (
          <div className="space-y-4">
            {bookingStatus === 'pending' ? (
              <div className="ev-card p-5 space-y-3">
                <p className="text-ev-text font-medium">Respond to this request</p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="ev-btn-primary text-sm py-2 px-4 bg-ev-success border-0"
                    onClick={() => void respond('accept')}
                    disabled={!!busyAction}
                  >
                    {busyAction === 'accept' ? 'Working…' : 'Accept booking'}
                  </button>
                  <button
                    type="button"
                    className="ev-btn-secondary text-sm py-2 px-4"
                    onClick={() => void respond('decline')}
                    disabled={!!busyAction}
                  >
                    {busyAction === 'decline' ? 'Working…' : 'Decline'}
                  </button>
                </div>
              </div>
            ) : null}

            {bookingStatus === 'expired' ? (
              <p className="text-ev-error text-sm bg-ev-error/5 border border-ev-error/20 rounded-lg px-4 py-3">
                This booking request has expired. The customer has been notified.
              </p>
            ) : null}

            <div className="ev-card p-5 space-y-3">
              <h2 className="text-ev-text font-semibold text-sm uppercase tracking-wide text-ev-muted">Customer</h2>
              <p className="text-ev-text font-semibold">{cleanText(booking.customer_name, 'Customer')}</p>
              <p className="text-ev-muted text-sm">{address || 'Address on request'}</p>
              {booking.customer_phone ? (
                <a
                  href={`tel:${String(booking.customer_phone).replace(/\s/g, '')}`}
                  className="ev-btn-secondary text-sm py-2 px-4 inline-flex items-center gap-2 w-fit"
                >
                  <Phone size={16} />
                  {booking.customer_phone}
                </a>
              ) : (
                <p className="text-ev-subtle text-xs">Phone not on file</p>
              )}
            </div>

            <div className="ev-card p-5 space-y-2">
              <h2 className="text-ev-text font-semibold text-sm uppercase tracking-wide text-ev-muted">Job</h2>
              <p className="text-ev-text text-sm">
                <span className="text-ev-muted">Product: </span>
                {cleanText(booking.product_name, '—')}
              </p>
              <p className="text-ev-text text-sm">
                <span className="text-ev-muted">Issue: </span>
                {cleanText(booking.issue, '—')}
              </p>
              <p className="text-ev-muted text-sm">
                Booked:{' '}
                {formatTimeWindow(booking.preferred_date || null, booking.time_from || null, booking.time_to || null)}
              </p>
              {booking.accepted_at ? (
                <p className="text-ev-muted text-xs">Accepted: {new Date(booking.accepted_at).toLocaleString('en-IN')}</p>
              ) : null}
            </div>

            {bookingStatus === 'accepted' && jobStatus !== 'completed' ? (
              <div className="ev-card p-5 space-y-4">
                <h2 className="text-ev-text font-semibold">Status</h2>

                {jobStatus === 'on_the_way' ? (
                  <p className="text-ev-success text-sm bg-ev-success/10 border border-ev-success/25 rounded-lg px-3 py-2">
                    Customer can now see your live location. Drive safely.
                  </p>
                ) : null}

                <div className="flex flex-col gap-2">
                  {(jobStatus === 'accepted' || jobStatus === '') && (
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="ev-btn-primary text-sm py-2.5 px-4"
                        onClick={() => void updateStatus('on_the_way')}
                        disabled={!!busyAction}
                      >
                        {busyAction === 'on_the_way' ? 'Updating…' : 'On the way'}
                      </button>
                      {mapsUrl ? (
                        <a
                          href={mapsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ev-btn-secondary text-sm py-2.5 px-4 inline-flex items-center gap-2"
                        >
                          Navigate (Google Maps)
                          <ExternalLink size={14} />
                        </a>
                      ) : null}
                    </div>
                  )}

                  {jobStatus === 'on_the_way' && (
                    <>
                      {mapsUrl ? (
                        <a
                          href={mapsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ev-btn-secondary text-sm py-2.5 px-4 text-center inline-flex items-center justify-center gap-2"
                        >
                          Open in Google Maps
                          <ExternalLink size={14} />
                        </a>
                      ) : null}
                      <button
                        type="button"
                        className="ev-btn-primary text-sm py-2.5 px-4"
                        onClick={() => void updateStatus('reached')}
                        disabled={!!busyAction}
                      >
                        {busyAction === 'reached' ? 'Updating…' : 'Reached'}
                      </button>
                    </>
                  )}

                  {jobStatus === 'reached' && (
                    <button
                      type="button"
                      className="ev-btn-primary text-sm py-2.5 px-4"
                      onClick={() => void updateStatus('work_started')}
                      disabled={!!busyAction}
                    >
                      {busyAction === 'work_started' ? 'Updating…' : 'Work started'}
                    </button>
                  )}

                  {jobStatus === 'work_started' && (
                    <div className="space-y-2">
                      {!booking.work_photo_url ? (
                        <p className="text-ev-muted text-sm">
                          Upload a photo of the completed work (required to close the job).
                        </p>
                      ) : null}
                      {booking.work_photo_url ? (
                        <button
                          type="button"
                          className="ev-btn-primary text-sm py-2.5 px-4 bg-ev-success border-0"
                          onClick={() => void updateStatus('completed')}
                          disabled={!!busyAction}
                        >
                          {busyAction === 'completed' ? 'Closing…' : 'Work completed'}
                        </button>
                      ) : (
                        <Link
                          href={`/electrician/jobs/${bookingId}/upload-photo`}
                          className="ev-btn-primary text-sm py-2.5 px-4 text-center inline-block w-full"
                        >
                          Upload completion photo
                        </Link>
                      )}
                    </div>
                  )}
                </div>

                {jobStatus === 'on_the_way' ? (
                  <div className="ev-card p-4 bg-ev-surface2/50">
                    <p className="text-ev-text font-medium text-sm mb-2">Live location</p>
                    {liveCoords ? (
                      <iframe
                        title="live-tracking-map"
                        src={mapEmbedUrl(liveCoords.lat, liveCoords.lng)}
                        className="w-full h-64 rounded-xl border border-ev-border"
                      />
                    ) : (
                      <p className="text-ev-muted text-xs">Share location to show the map.</p>
                    )}
                  </div>
                ) : null}
              </div>
            ) : null}

            {jobStatus === 'completed' || bookingStatus === 'declined' ? (
              <div className="ev-card p-5 text-ev-muted text-sm">
                {jobStatus === 'completed'
                  ? 'Job closed. The customer has been notified and will receive a review prompt. Great work!'
                  : 'This booking was declined.'}
              </div>
            ) : null}
          </div>
        )}
      </div>
    </ElectricianShell>
  );
}
