import type { Metadata } from 'next';
import Link from 'next/link';
import { PublicShell } from '@/components/public/PublicShell';
import { LegalPolicyLayout } from '@/components/public/LegalPolicyLayout';
import { publicBrandName } from '@/lib/public-brand';

export const metadata: Metadata = {
  title: `Pricing policy — ${publicBrandName}`,
  description: `How prices are shown for customers and dealers on ${publicBrandName}.`,
};

export default function PricingPolicyPage() {
  return (
    <PublicShell>
      <LegalPolicyLayout title="Pricing policy">
        <p>
          List prices on <strong className="text-ev-text">{publicBrandName}</strong> are set by the listing shop. Retail
          (customer) and wholesale (dealer) prices may differ; verified dealers see dealer pricing where enabled.
        </p>
        <p>
          <strong className="text-ev-text">Taxes and fees.</strong> Applicable taxes and any platform or payment fees
          are calculated and displayed at checkout before you pay.
        </p>
        <p>
          <strong className="text-ev-text">Errors.</strong> We aim to correct obvious pricing mistakes quickly. If you
          believe a listing is incorrect, please{' '}
          <Link href="/contact" className="text-ev-primary font-medium hover:underline">
            contact us
          </Link>
          .
        </p>
      </LegalPolicyLayout>
    </PublicShell>
  );
}
