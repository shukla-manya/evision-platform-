import { Suspense } from 'react';
import { PublicShell } from '@/components/public/PublicShell';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <PublicShell>
      <Suspense fallback={<div className="min-h-[40vh]" />}>{children}</Suspense>
    </PublicShell>
  );
}
