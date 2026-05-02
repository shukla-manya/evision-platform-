'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2, Star, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { superadminApi } from '@/lib/api';
import { getApiErrorMessage } from '@/lib/api-errors';
import { SuperadminShell } from '@/components/superadmin/SuperadminShell';

type ReviewRow = {
  id: string;
  customer_name?: string;
  electrician_name?: string;
  product_name?: string;
  review_kind?: 'electrician' | 'product';
  rating?: number;
  comment?: string | null;
  photo_url?: string | null;
  created_at?: string;
};

export default function CustomerReviewsModerationPage() {
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await superadminApi.getReviews();
      setReviews(Array.isArray(data) ? (data as ReviewRow[]) : []);
    } catch (e: unknown) {
      toast.error(getApiErrorMessage(e, 'Could not load reviews'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function remove(id: string) {
    setDeleting(id);
    try {
      await superadminApi.deleteReview(id);
      toast.success('Review deleted');
      setConfirmId(null);
      await load();
    } catch (e: unknown) {
      toast.error(getApiErrorMessage(e, 'Delete failed'));
    } finally {
      setDeleting(null);
    }
  }

  return (
    <SuperadminShell>
      <main className="w-full min-w-0">
        <h1 className="text-2xl font-bold text-ev-text mb-1">Customer reviews</h1>
        <p className="text-ev-muted text-sm mb-8">Moderate public feedback. Deletion is permanent.</p>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 size={28} className="animate-spin text-ev-primary" />
          </div>
        ) : reviews.length === 0 ? (
          <div className="ev-card p-12 text-center text-ev-muted">No reviews yet</div>
        ) : (
          <div className="space-y-4">
            {reviews.map((r) => (
              <div key={r.id} className="ev-card p-5 border-ev-border space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-ev-text font-semibold">{r.customer_name}</p>
                    <p className="text-sm text-ev-muted">
                      {r.review_kind === 'product' || r.product_name
                        ? `for product: ${r.product_name || 'Product'}`
                        : `for technician: ${r.electrician_name || '—'}`}
                    </p>
                    <p className="text-xs text-ev-subtle mt-1">
                      {r.created_at ? new Date(r.created_at).toLocaleString('en-IN') : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 text-ev-warning font-semibold">
                    <Star size={16} fill="currentColor" />
                    {Number(r.rating || 0).toFixed(1)}
                  </div>
                </div>
                {r.comment ? <p className="text-sm text-ev-text leading-relaxed">{r.comment}</p> : null}
                {r.photo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={r.photo_url} alt="" className="max-h-48 rounded-lg border border-ev-border object-contain" />
                ) : null}
                <button
                  type="button"
                  onClick={() => setConfirmId(r.id)}
                  className="inline-flex items-center gap-2 text-sm font-semibold text-red-600 hover:text-red-500"
                >
                  <Trash2 size={14} />
                  Delete review
                </button>
              </div>
            ))}
          </div>
        )}

        {confirmId ? (
          <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/50">
            <div className="ev-card max-w-md w-full p-6 space-y-4">
              <p className="text-ev-text font-semibold">Are you sure?</p>
              <p className="text-sm text-ev-muted">This cannot be undone.</p>
              <div className="flex gap-2 justify-end">
                <button type="button" className="ev-btn-secondary text-sm py-2 px-4" onClick={() => setConfirmId(null)}>
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={deleting === confirmId}
                  className="text-sm py-2 px-4 rounded-xl bg-red-600 text-white font-medium hover:bg-red-500 disabled:opacity-50"
                  onClick={() => remove(confirmId)}
                >
                  {deleting === confirmId ? 'Deleting…' : 'Delete permanently'}
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </main>
    </SuperadminShell>
  );
}
