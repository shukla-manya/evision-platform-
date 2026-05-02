import { DealerGstPendingBanner } from '@/components/dealer/DealerGstPendingBanner';
import { PublicFooter } from '@/components/public/PublicFooter';
import { PublicNavbar } from '@/components/public/PublicNavbar';
import { Suspense } from 'react';

type PublicShellProps = {
  children: React.ReactNode;
  /**
   * Set for `(auth)` routes (e.g. `/login`, `/register`). Hides shopper “Home” + customer “Dashboard”
   * in the header so sign-in surfaces stay minimal regardless of pathname edge cases.
   */
  authSurface?: boolean;
};

export function PublicShell({ children, authSurface = false }: PublicShellProps) {
  return (
    <div className="flex min-h-screen w-full min-w-0 max-w-[100vw] flex-col overflow-x-hidden bg-ev-bg">
      <Suspense fallback={<div className="h-16 ev-header" />}>
        <PublicNavbar authSurface={authSurface} />
      </Suspense>
      <DealerGstPendingBanner />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">{children}</div>
      <PublicFooter />
    </div>
  );
}
