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

  /**
   * Full-bleed inside `.ev-shell-body`: that wrapper uses horizontal + vertical padding, which
   * otherwise leaves cream “gutters” and a gap above the first child. Use explicit width so the
   * bar paints edge-to-edge in a flex column (plain `w-full` + negative margins can leave a
   * sliver on the right in some layouts).
   */
  const outerLayout = bleedGutter
    ? [
        'box-border max-w-none shrink-0 self-stretch',
        '-mx-4 -mt-4 w-[calc(100%+2rem)] px-4',
        'sm:-mx-5 sm:-mt-5 sm:w-[calc(100%+2.5rem)] sm:px-5',
        'md:-mx-6 md:-mt-6 md:w-[calc(100%+3rem)] md:px-6',
        'lg:-mx-8 lg:-mt-8 lg:w-[calc(100%+4rem)] lg:px-8',
      ].join(' ')
    : 'w-full shrink-0 px-4 sm:px-6';

  return (
    <div
      role="status"
      className={[
        'border-y border-amber-400/80 bg-amber-100 py-3.5 shadow-sm',
        outerLayout,
      ].join(' ')}
    >
      <div className="mx-auto max-w-3xl text-center">
        <p className="text-sm font-bold tracking-tight text-amber-950">Wholesale pricing after GST approval</p>
        <p className="mt-1.5 text-sm leading-relaxed text-amber-900">
          Our team is verifying your GSTIN. Until then you can browse and buy at retail prices. After verification
          you&apos;ll get an email and the full catalogue will show dealer (wholesale) prices at checkout.
        </p>
      </div>
    </div>
  );
}
