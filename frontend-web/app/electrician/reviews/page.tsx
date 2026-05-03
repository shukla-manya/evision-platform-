'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Loader2, Star } from 'lucide-react';
import toast from 'react-hot-toast';
import { electricianApi } from '@/lib/api';
import { ElectricianShell } from '@/components/electrician/ElectricianShell';
import { formatRequestedDate } from '@/lib/electrician-ui';

type Review = {
  id?: string;
  customer_name?: string;
  rating?: number;
  comment?: string | null;
  photo_url?: string | null;
  created_at?: string;
};

export default function ElectricianReviewsPage() {
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [avg, setAvg] = useState(0);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const meRes = await electricianApi.me();
        const me = meRes.data as { id?: string; rating_avg?: number };
        const eid = String(me?.id || '');
        if (!eid) {
          setReviews([]);
          return;
        }
        const { data } = await electricianApi.getBookingProfile(eid);
        const revs = Array.isArray((data as { reviews?: Review[] })?.reviews)
          ? (data as { reviews: Review[] }).reviews
          : [];
        setReviews(revs);
        setAvg(Number(me?.rating_avg || 0));
      } catch {
        toast.error('Failed to load reviews');
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const breakdown = useMemo(() => {
    const m: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    for (const r of reviews) {
      const n = Math.round(Number(r.rating || 0));
      if (n >= 1 && n <= 5) m[n] += 1;
    }
    return m;
  }, [reviews]);

  return (
    <ElectricianShell>
      <div className="w-full min-w-0 max-w-full space-y-6">
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-2xl font-bold text-ev-text flex items-center gap-2">
            <Star size={24} className="text-ev-warning" />
            My reviews
          </h1>
          <Link href="/electrician/profile" className="ev-btn-secondary text-sm py-2 px-4 inline-flex shrink-0">
            Profile
          </Link>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-ev-muted py-12">
            <Loader2 size={20} className="animate-spin text-ev-primary" />
            Loading…
          </div>
        ) : reviews.length === 0 ? (
          <div className="ev-card p-8 text-ev-muted text-sm text-center leading-relaxed">
            No reviews yet. Complete your first job to start building your profile.
          </div>
        ) : (
          <>
            <div className="ev-card p-6 space-y-4">
              <p className="text-ev-text text-lg">
                <span className="text-ev-warning">⭐</span>{' '}
                <span className="font-bold tabular-nums">{avg.toFixed(1)}</span> out of 5
              </p>
              <p className="text-ev-muted text-sm">Based on {reviews.length} reviews</p>
              <div className="border-t border-ev-border pt-4 space-y-2">
                <p className="text-ev-muted text-xs font-medium uppercase tracking-wide">Rating breakdown</p>
                {[5, 4, 3, 2, 1].map((n) => (
                  <div key={n} className="flex items-center justify-between text-sm">
                    <span className="text-ev-text">{n} star</span>
                    <span className="text-ev-muted tabular-nums">{breakdown[n]}</span>
                  </div>
                ))}
              </div>
            </div>

            <ul className="space-y-3">
              {reviews.map((r) => (
                <li key={String(r.id)} className="ev-card p-5 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-ev-text font-medium">{String(r.customer_name || 'Customer')}</p>
                    <p className="text-ev-warning text-sm font-semibold inline-flex items-center gap-0.5">
                      <Star size={14} className="fill-ev-warning" />
                      {Number(r.rating || 0)} / 5
                    </p>
                  </div>
                  {r.comment ? <p className="text-ev-text text-sm leading-relaxed">{String(r.comment)}</p> : null}
                  <p className="text-ev-subtle text-xs">
                    {r.created_at ? formatRequestedDate(r.created_at) : '—'}
                  </p>
                  {r.photo_url ? (
                    <div className="pt-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={String(r.photo_url)} alt="Review" className="max-h-48 rounded-lg border border-ev-border" />
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </ElectricianShell>
  );
}
