'use client';

import { useEffect, useMemo, useState } from 'react';
import { Loader2, Star } from 'lucide-react';
import toast from 'react-hot-toast';
import { electricianApi } from '@/lib/api';
import { ElectricianShell } from '@/components/electrician/ElectricianShell';
import { cleanText } from '@/lib/electrician-ui';

type Row = {
  id: string;
  customer_name?: string;
  issue?: string;
  product_name?: string;
  customer_id?: string;
  updated_at?: string;
  created_at?: string;
};

type Review = {
  customer_id?: string;
  rating?: number;
};

export default function ElectricianHistoryBookingsPage() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Row[]>([]);
  const [avgRating, setAvgRating] = useState(0);
  const [reviewTotal, setReviewTotal] = useState(0);
  const [ratingByCustomer, setRatingByCustomer] = useState<Record<string, number>>({});

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [hist, meRes] = await Promise.all([
          electricianApi.historyBookings(),
          electricianApi.me(),
        ]);
        const list = Array.isArray(hist.data) ? (hist.data as Row[]) : [];
        setRows(list);
        const me = meRes.data as { id?: string; rating_avg?: number; rating_count?: number };
        setAvgRating(Number(me?.rating_avg || 0));
        setReviewTotal(Number(me?.rating_count || 0));

        const eid = String(me?.id || '');
        if (eid) {
          try {
            const { data } = await electricianApi.getBookingProfile(eid);
            const revs = Array.isArray((data as { reviews?: Review[] })?.reviews)
              ? (data as { reviews: Review[] }).reviews
              : [];
            const map: Record<string, number> = {};
            for (const r of revs) {
              const cid = String(r.customer_id || '');
              if (cid && map[cid] === undefined) map[cid] = Number(r.rating || 0);
            }
            setRatingByCustomer(map);
          } catch {
            setRatingByCustomer({});
          }
        }
      } catch {
        toast.error('Failed to load history');
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const stats = useMemo(() => {
    return {
      totalJobs: rows.length,
      avg: avgRating,
      reviews: reviewTotal,
    };
  }, [rows.length, avgRating, reviewTotal]);

  return (
    <ElectricianShell>
      <div className="w-full min-w-0 max-w-full space-y-6">
        <h1 className="text-2xl font-bold text-ev-text">Completed jobs</h1>

        <div className="grid grid-cols-3 gap-3">
          <div className="ev-card p-4 text-center">
            <p className="text-ev-muted text-[10px] uppercase tracking-wide font-medium">Total jobs</p>
            <p className="text-xl font-bold text-ev-text tabular-nums mt-1">{stats.totalJobs}</p>
          </div>
          <div className="ev-card p-4 text-center">
            <p className="text-ev-muted text-[10px] uppercase tracking-wide font-medium">Avg rating</p>
            <p className="text-xl font-bold text-ev-text tabular-nums mt-1 inline-flex items-center justify-center gap-0.5">
              <Star size={16} className="text-ev-warning fill-ev-warning shrink-0" />
              {stats.avg > 0 ? stats.avg.toFixed(1) : '—'}
            </p>
          </div>
          <div className="ev-card p-4 text-center">
            <p className="text-ev-muted text-[10px] uppercase tracking-wide font-medium">Total reviews</p>
            <p className="text-xl font-bold text-ev-text tabular-nums mt-1">{stats.reviews}</p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-ev-muted py-12">
            <Loader2 size={20} className="animate-spin text-ev-primary" />
            Loading…
          </div>
        ) : rows.length === 0 ? (
          <div className="ev-card p-8 text-ev-muted text-sm text-center">No completed jobs yet.</div>
        ) : (
          <ul className="space-y-2">
            {rows.map((b) => {
              const cid = String(b.customer_id || '');
              const stars = cid ? ratingByCustomer[cid] : undefined;
              const when = b.updated_at || b.created_at || '';
              const dateStr = when
                ? new Date(when).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })
                : '—';
              return (
                <li key={b.id} className="ev-card px-4 py-3 flex flex-wrap items-center justify-between gap-2 text-sm">
                  <div>
                    <p className="text-ev-text font-medium">{cleanText(b.customer_name, 'Customer')}</p>
                    <p className="text-ev-muted text-xs mt-0.5">{cleanText(b.product_name || b.issue, 'Service')}</p>
                  </div>
                  <div className="text-right text-xs text-ev-muted">
                    <p>{dateStr}</p>
                    {stars != null && stars > 0 ? (
                      <p className="text-ev-warning font-medium mt-1 inline-flex items-center gap-0.5">
                        <Star size={12} className="fill-ev-warning" />
                        Review received: {stars}★
                      </p>
                    ) : (
                      <p className="text-ev-subtle mt-1">No review yet</p>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </ElectricianShell>
  );
}
