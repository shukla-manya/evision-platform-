import { DealerGstPendingBanner } from '@/components/dealer/DealerGstPendingBanner';
import { PublicFooter } from '@/components/public/PublicFooter';
import { PublicNavbar } from '@/components/public/PublicNavbar';
import { Suspense } from 'react';

export function PublicShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen min-w-0 flex-col overflow-x-hidden bg-ev-bg">
      <Suspense fallback={<div className="h-16 ev-header" />}>
        <PublicNavbar />
      </Suspense>
      <DealerGstPendingBanner />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">{children}</div>
      <PublicFooter />
    </div>
  );
}
