'use client';

import { useEffect, useState } from 'react';
import { authApi } from '@/lib/api';
import { getRole, getToken } from '@/lib/auth';

type Props = {
  /**
   * When true, cancels horizontal padding from `.ev-shell-body` so the strip runs
   * edge-to-edge in the main column (dealer dashboard / invoices / service).
   * Leave false for full-width shells with no side padding (e.g. under `PublicNavbar`).
   */
  bleedGutter?: boolean;
};

/**
 * Shown for logged-in dealers until superadmin verifies GST (gst_verified).
 */
export function DealerGstPendingBanner({ bleedGutter = false }: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const token = getToken();
    const role = getRole();
    if (!token || role !== 'dealer') {
      setVisible(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const { data } = await authApi.me();
        const u = data?.user as Record<string, unknown> | undefined;
        if (cancelled || !u) return;
        const gv = u.gst_verified;
        const verified = gv === true || gv === 'true' || gv === 1 || gv === '1';
        setVisible(!verified);
      } catch {
        if (!cancelled) setVisible(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!visible) return null;

  const gutterBleed = bleedGutter
    ? '-mx-4 px-4 sm:-mx-5 sm:px-5 md:-mx-6 md:px-6 lg:-mx-8 lg:px-8'
    : '';

  return (
    <div
      role="status"
      className={[
        'w-full shrink-0 border-y border-amber-400/80 bg-amber-100 py-3.5 shadow-sm',
        gutterBleed,
      ].join(' ')}
    >
      <div className="mx-auto max-w-3xl px-1 text-center sm:px-2">
        <p className="text-sm font-bold tracking-tight text-amber-950">Wholesale pricing after GST approval</p>
        <p className="mt-1.5 text-sm leading-relaxed text-amber-900">
          Our team is verifying your GSTIN. Until then you can browse and buy at retail prices. After verification
          you&apos;ll get an email and the full catalogue will show dealer (wholesale) prices at checkout.
        </p>
      </div>
    </div>
  );
}
