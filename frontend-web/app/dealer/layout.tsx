import { DealerGstPendingBanner } from '@/components/dealer/DealerGstPendingBanner';

export default function DealerLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <DealerGstPendingBanner />
      {children}
    </>
  );
}
