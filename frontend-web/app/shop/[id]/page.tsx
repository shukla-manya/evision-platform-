'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { PublicShell } from '@/components/public/PublicShell';

/** Legacy URL: `/shop/:id` → canonical product page. */
export default function ShopProductRedirectPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  useEffect(() => {
    if (id) router.replace(`/products/${id}`);
  }, [id, router]);

  return (
    <PublicShell>
      <div className="flex flex-col items-center justify-center py-32 text-ev-muted gap-2">
        <Loader2 className="animate-spin text-ev-primary" size={24} />
        <p className="text-sm">Opening product…</p>
      </div>
    </PublicShell>
  );
}
