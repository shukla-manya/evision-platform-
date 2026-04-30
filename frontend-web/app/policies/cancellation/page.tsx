import type { Metadata } from 'next';
import Link from 'next/link';
import { PublicShell } from '@/components/public/PublicShell';
import { LegalPolicyLayout } from '@/components/public/LegalPolicyLayout';
import { publicBrandName } from '@/lib/public-brand';

export const metadata: Metadata = {
  title: `Cancellation policy — ${publicBrandName}`,
  description: `Order cancellation rules on ${publicBrandName}.`,
};

export default function CancellationPolicyPage() {
  return (
    <PublicShell>
      <LegalPolicyLayout title="Cancellation policy">
        <p>
          Whether you can cancel an order on <strong className="text-ev-text">{publicBrandName}</strong> depends on how
          far the order has progressed (e.g. payment confirmed, packed, or shipped). Available actions are shown in{' '}
          <strong className="text-ev-text">My orders</strong> for each order group.
        </p>
        <p>
          <strong className="text-ev-text">Before dispatch.</strong> If cancellation is still available in the app,
          use it there for the fastest path. Refunds, when applicable, follow our payment partner timelines.
        </p>
        <p>
          <strong className="text-ev-text">After dispatch.</strong> You may need to request a return after delivery
          instead of a cancellation. See the{' '}
          <Link href="/policies/returns-refund" className="text-ev-primary font-medium hover:underline">
            Return & refund policy
          </Link>{' '}
          and <Link href="/faq" className="text-ev-primary font-medium hover:underline">FAQs</Link>.
        </p>
      </LegalPolicyLayout>
    </PublicShell>
  );
}
