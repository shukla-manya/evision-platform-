'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { getRole, isLoggedIn, redirectByRole } from '@/lib/auth';
import { PublicShell } from '@/components/public/PublicShell';

/** `/dashboard` kept for bookmarks — forwards customers to the shop (hub tiles removed). */
export default function CustomerDashboardPage() {
  const router = useRouter();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!isLoggedIn()) {
      router.replace('/login');
      return;
    }
    const r = getRole();
    if (!r) {
      router.replace('/login');
      return;
    }
    if (r !== 'customer') {
      router.replace(redirectByRole(r));
      return;
    }
    router.replace('/shop');
  }, [router]);

  return (
    <PublicShell>
      <main className="ev-container py-24 flex justify-center items-center gap-2 text-ev-muted">
        <Loader2 className="animate-spin text-ev-primary" size={22} aria-hidden />
        <span>Loading…</span>
      </main>
    </PublicShell>
  );
}
