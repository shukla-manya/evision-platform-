'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { authApi, serviceApi } from '@/lib/api';
import { getRole } from '@/lib/auth';
import { PublicShell } from '@/components/public/PublicShell';

function RequestFormInner() {
  const router = useRouter();
  const sp = useSearchParams();
  const subOrderId = sp.get('sub_order_id') || '';
  const productHint = sp.get('product') || 'Product from your order';

  const role = typeof window !== 'undefined' ? getRole() : undefined;
  const ok = role === 'customer' || role === 'dealer';

  const [loadingMe, setLoadingMe] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    issue: '',
    preferred_date: '',
    time_from: '10:00',
    time_to: '14:00',
    service_address: '',
    lat: '12.9716',
    lng: '77.5946',
  });
  const [photo, setPhoto] = useState<File | null>(null);

  useEffect(() => {
    if (!ok) return;
    authApi
      .me()
      .then((r) => {
        const u = (r.data as { user?: { address_book?: Record<string, unknown>[] } })?.user;
        const book = Array.isArray(u?.address_book) ? u!.address_book! : [];
        const primary = book.find((a) => Boolean(a.is_default)) || book[0];
        if (primary) {
          const line = [primary.address, primary.city, primary.state, primary.pincode].filter(Boolean).join(', ');
          setForm((f) => ({
            ...f,
            service_address: String(line || f.service_address),
            lat: primary.lat != null ? String(primary.lat) : f.lat,
            lng: primary.lng != null ? String(primary.lng) : f.lng,
          }));
        }
      })
      .catch(() => {})
      .finally(() => setLoadingMe(false));
  }, [ok]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.issue.trim() || form.issue.trim().length < 5) {
      toast.error('Describe the problem (at least 5 characters)');
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(form.preferred_date)) {
      toast.error('Preferred visit date must be YYYY-MM-DD');
      return;
    }
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('issue', form.issue.trim());
      fd.append('preferred_date', form.preferred_date);
      fd.append('time_from', form.time_from);
      fd.append('time_to', form.time_to);
      fd.append('lat', form.lat);
      fd.append('lng', form.lng);
      if (form.service_address.trim()) fd.append('service_address', form.service_address.trim());
      if (subOrderId) fd.append('order_sub_order_id', subOrderId);
      if (productHint) fd.append('product_label', productHint);
      if (photo) fd.append('photo', photo);
      const { data } = await serviceApi.createRequest(fd);
      const req = data as { id?: string; lat?: number; lng?: number };
      if (!req.id) throw new Error('No request id');
      toast.success('Request created');
      router.push(
        `/service/technicians?request_id=${encodeURIComponent(String(req.id))}&lat=${encodeURIComponent(String(req.lat ?? form.lat))}&lng=${encodeURIComponent(String(req.lng ?? form.lng))}`,
      );
    } catch {
      toast.error('Could not submit request');
    } finally {
      setSubmitting(false);
    }
  }

  if (!ok) {
    return (
      <main className="ev-container py-16 text-center text-ev-muted">
        <p className="text-ev-text font-medium mb-2">Sign in required</p>
        <Link href="/login" className="ev-btn-primary inline-flex mt-4">
          Sign in
        </Link>
      </main>
    );
  }

  return (
    <main className="ev-container py-8">
      <Link href="/orders" className="text-ev-muted text-sm inline-flex items-center gap-1 hover:text-ev-text mb-6">
        <ArrowLeft size={14} /> Orders
      </Link>
      <h1 className="text-2xl font-bold text-ev-text mb-2">Tell us about the issue</h1>
      <p className="text-ev-muted text-sm mb-6">We&apos;ll match you with rated technicians near your service address.</p>
      {loadingMe ? (
        <div className="flex justify-center py-12 text-ev-muted gap-2">
          <Loader2 className="animate-spin text-ev-primary" size={22} /> Loading…
        </div>
      ) : (
        <form onSubmit={onSubmit} className="ev-card p-6 space-y-4">
          <div>
            <label className="ev-label">Product</label>
            <input className="ev-input bg-ev-surface2/80" readOnly value={productHint} />
            {subOrderId ? <p className="text-ev-subtle text-xs mt-1">Linked order shipment: {subOrderId.slice(0, 8)}…</p> : null}
          </div>
          <div>
            <label className="ev-label">Describe the problem</label>
            <textarea
              className="ev-input min-h-[100px]"
              required
              minLength={5}
              value={form.issue}
              onChange={(e) => setForm((f) => ({ ...f, issue: e.target.value }))}
              placeholder="What needs attention?"
            />
          </div>
          <div>
            <label className="ev-label">Upload a photo (optional)</label>
            <input type="file" accept="image/*" className="text-sm text-ev-muted w-full" onChange={(e) => setPhoto(e.target.files?.[0] || null)} />
          </div>
          <div>
            <label className="ev-label">Preferred visit date</label>
            <input
              type="date"
              className="ev-input"
              required
              value={form.preferred_date}
              onChange={(e) => setForm((f) => ({ ...f, preferred_date: e.target.value }))}
            />
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="ev-label">Preferred time from</label>
              <input
                type="time"
                className="ev-input"
                value={form.time_from}
                onChange={(e) => setForm((f) => ({ ...f, time_from: e.target.value }))}
              />
            </div>
            <div>
              <label className="ev-label">Preferred time to</label>
              <input
                type="time"
                className="ev-input"
                value={form.time_to}
                onChange={(e) => setForm((f) => ({ ...f, time_to: e.target.value }))}
              />
            </div>
          </div>
          <div>
            <label className="ev-label">Service address (editable)</label>
            <textarea
              className="ev-input min-h-[80px]"
              value={form.service_address}
              onChange={(e) => setForm((f) => ({ ...f, service_address: e.target.value }))}
            />
          </div>
          <button type="submit" disabled={submitting} className="ev-btn-primary w-full py-2.5 inline-flex items-center justify-center gap-2">
            {submitting ? <Loader2 size={18} className="animate-spin" /> : null}
            Find technicians near me →
          </button>
        </form>
      )}
    </main>
  );
}

export default function ServiceRequestPage() {
  return (
    <PublicShell>
      <Suspense
        fallback={
          <div className="flex justify-center py-24 text-ev-muted gap-2">
            <Loader2 className="animate-spin text-ev-primary" size={22} /> Loading…
          </div>
        }
      >
        <RequestFormInner />
      </Suspense>
    </PublicShell>
  );
}
