'use client';

import { useEffect, useState } from 'react';
import { authApi } from '@/lib/api';
import { getRole, getToken } from '@/lib/auth';

/**
 * Shown for logged-in dealers until superadmin verifies GST (gst_verified).
 */
export function DealerGstPendingBanner() {
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
        const verified = u.gst_verified === true || u.gst_verified === 'true';
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

  return (
    <div
      role="status"
      className="w-full border-b border-amber-500/35 bg-amber-500/10 px-4 py-2.5 text-center text-sm text-amber-950 dark:text-amber-100"
    >
      <span className="font-semibold">Wholesale pricing after GST approval</span>
      <span className="text-amber-900/90 dark:text-amber-100/90">
        {' '}
        — Our team is verifying your GSTIN. Until then you can browse and buy at retail prices; after verification
        you&apos;ll get an email and the full catalogue will show dealer (wholesale) prices at checkout.
      </span>
    </div>
  );
}
