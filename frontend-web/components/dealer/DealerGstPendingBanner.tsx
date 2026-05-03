'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { authApi } from '@/lib/api';
import { getRole, getToken } from '@/lib/auth';

const GST_PENDING_TICKER =
  'Wholesale pricing after GST approval — Our team is verifying your GSTIN. Until then you can browse and buy at retail prices. After verification you\u2019ll get an email and the full catalogue will show dealer (wholesale) prices at checkout.';

function isDealerGstVerified(value: unknown): boolean {
  if (value === true || value === 1) return true;
  if (value === 'true' || value === '1') return true;
  if (typeof value === 'string' && value.trim().toLowerCase() === 'true') return true;
  return false;
}

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
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const token = getToken();
    const role = getRole();
    if (!token || role !== 'dealer') {
      setVisible(false);
      return;
    }
    let cancelled = false;
    let fetchGen = 0;

    const refresh = () => {
      const gen = ++fetchGen;
      void (async () => {
        try {
          const { data } = await authApi.me();
          if (cancelled || gen !== fetchGen) return;
          const u = data?.user as Record<string, unknown> | undefined;
          if (!u) return;
          setVisible(!isDealerGstVerified(u.gst_verified));
        } catch {
          if (!cancelled && gen === fetchGen) setVisible(false);
        }
      })();
    };

    refresh();

    const onVisible = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      cancelled = true;
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [pathname]);

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
      aria-label={GST_PENDING_TICKER}
      className={[
        'border-y border-amber-400/80 bg-amber-100 py-2 shadow-sm mb-5 sm:mb-6',
        outerLayout,
      ].join(' ')}
    >
      {/* Infinite marquee: two identical segments, animate –50% for a seamless loop */}
      <div className="motion-reduce:hidden overflow-hidden">
        <div className="flex w-max animate-[evGstMarquee_55s_linear_infinite] will-change-transform">
          <span className="shrink-0 whitespace-nowrap pr-16 text-sm font-semibold tracking-tight text-amber-950">
            {GST_PENDING_TICKER}
          </span>
          <span className="shrink-0 whitespace-nowrap pr-16 text-sm font-semibold tracking-tight text-amber-950" aria-hidden>
            {GST_PENDING_TICKER}
          </span>
        </div>
      </div>
      <p className="hidden text-center text-sm font-semibold leading-snug text-amber-950 motion-reduce:block">
        {GST_PENDING_TICKER}
      </p>
    </div>
  );
}
