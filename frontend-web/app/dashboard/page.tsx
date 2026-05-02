'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { getRole, isLoggedIn, redirectByRole } from '@/lib/auth';
import { PublicShell } from '@/components/public/PublicShell';

/** Customer “dashboard” URL kept for bookmarks / old links — hub tiles removed; land in the shop instead. */
export default function CustomerDashboardPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);

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
    setReady(true);
    router.replace('/shop');
  }, [router]);

  return (
    <PublicShell>
      <main className="max-w-5xl mx-auto px-4 py-24 flex justify-center items-center gap-2 text-ev-muted">
        <Loader2 className="animate-spin text-ev-primary" size={22} aria-hidden />
        <span>{ready ? 'Opening shop…' : 'Loading…'}</span>
      </main>
    </PublicShell>
  );
}
