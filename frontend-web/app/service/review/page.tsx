'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, Star } from 'lucide-react';
import toast from 'react-hot-toast';
import { reviewsApi } from '@/lib/api';
import { getRole } from '@/lib/auth';
import { PublicShell } from '@/components/public/PublicShell';

function ReviewInner() {
  const router = useRouter();
  const sp = useSearchParams();
  const electricianId = sp.get('electricianId') || '';
  const name = sp.get('name') || 'this technician';

  const role = typeof window !== 'undefined' ? getRole() : undefined;
  const ok = role === 'customer' || role === 'dealer';

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (rating < 1 || rating > 5) {
      toast.error('Tap a star rating (1–5)');
      return;
    }
    if (!electricianId) {
      toast.error('Missing technician');
      return;
    }
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('rating', String(rating));
      if (comment.trim()) fd.append('comment', comment.trim());
      if (photo) fd.append('photo', photo);
      await reviewsApi.createElectricianReview(electricianId, fd);
      toast.success('Review submitted');
      router.replace(`/service/review/done?name=${encodeURIComponent(name)}`);
    } catch {
      toast.error('Could not submit review');
    } finally {
      setSaving(false);
    }
  }

  if (!ok) {
    return (
      <main className="ev-container py-16 text-center">
        <Link href="/login" className="ev-btn-primary">
          Sign in
        </Link>
      </main>
    );
  }

  if (!electricianId) {
    return (
      <main className="ev-container py-16 text-center text-ev-muted">
        Invalid link.
      </main>
    );
  }

  return (
    <main className="ev-container py-10">
      <h1 className="text-2xl font-bold text-ev-text mb-2">How was your service?</h1>
      <p className="text-ev-muted text-sm mb-8">
        Your review helps other customers choose the right technician.
      </p>
      <form onSubmit={onSubmit} className="ev-card p-6 space-y-6">
        <div>
          <p className="ev-label mb-2">Star rating</p>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                aria-label={`${n} stars`}
                onClick={() => setRating(n)}
                className="p-1 rounded-lg hover:bg-ev-surface2 transition-colors"
              >
                <Star
                  size={32}
                  className={n <= rating ? 'fill-ev-warning text-ev-warning' : 'text-ev-border'}
                />
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="ev-label">Write your experience</label>
          <textarea
            className="ev-input min-h-[120px]"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="What went well? What could improve?"
          />
        </div>
        <div>
          <label className="ev-label">Add a photo (optional)</label>
          <input type="file" accept="image/*" className="text-sm text-ev-muted w-full" onChange={(e) => setPhoto(e.target.files?.[0] || null)} />
        </div>
        <button type="submit" disabled={saving} className="ev-btn-primary w-full py-2.5 inline-flex items-center justify-center gap-2">
          {saving ? <Loader2 size={18} className="animate-spin" /> : null}
          Submit review
        </button>
      </form>
    </main>
  );
}

export default function ServiceReviewPage() {
  return (
    <PublicShell>
      <Suspense
        fallback={
          <div className="py-24 text-center text-ev-muted">
            <Loader2 className="animate-spin text-ev-primary inline" size={22} />
          </div>
        }
      >
        <ReviewInner />
      </Suspense>
    </PublicShell>
  );
}
