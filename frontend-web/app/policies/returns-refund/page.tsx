import type { Metadata } from 'next';
import Link from 'next/link';
import { PublicShell } from '@/components/public/PublicShell';
import { LegalPolicyLayout } from '@/components/public/LegalPolicyLayout';
import { publicBrandName } from '@/lib/public-brand';

export const metadata: Metadata = {
  title: `Return & refund policy — ${publicBrandName}`,
  description: `Returns and refunds for purchases on ${publicBrandName}.`,
};

export default function ReturnsRefundPolicyPage() {
  return (
    <PublicShell>
      <LegalPolicyLayout title="Return & refund policy">
        <p>
          This policy describes how returns and refunds work for products purchased through{' '}
          <strong className="text-ev-text">{publicBrandName}</strong>. Specific timelines may depend on the shop that
          fulfilled your order and product category (e.g. sealed electronics).
        </p>
        <p>
          <strong className="text-ev-text">Starting a return.</strong> Signed-in customers should open{' '}
          <strong className="text-ev-text">My orders</strong> and follow the actions available for each line item. If
          you cannot see a return option, contact support with your order ID.
        </p>
        <p>
          <strong className="text-ev-text">Refunds.</strong> Approved refunds are processed back to the original payment
          method where possible, in line with our payment partner and bank processing times.
        </p>
        <p>
          More context for common cases is in our <Link href="/faq" className="text-ev-primary font-medium hover:underline">FAQs</Link>.
        </p>
      </LegalPolicyLayout>
    </PublicShell>
  );
}
