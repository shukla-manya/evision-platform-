import { PublicFooter } from '@/components/public/PublicFooter';
import { PublicNavbar } from '@/components/public/PublicNavbar';
import { Suspense } from 'react';

export function PublicShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-ev-bg flex flex-col">
      <Suspense fallback={<div className="h-16 ev-header" />}>
        <PublicNavbar />
      </Suspense>
      <div className="flex-1">{children}</div>
      <PublicFooter />
    </div>
  );
}
