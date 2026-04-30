import type { Metadata } from 'next';
import { PublicShell } from '@/components/public/PublicShell';
import { LegalPolicyLayout } from '@/components/public/LegalPolicyLayout';
import { publicBrandName } from '@/lib/public-brand';

export const metadata: Metadata = {
  title: `Shipping policy — ${publicBrandName}`,
  description: `Shipping and delivery information for ${publicBrandName} orders.`,
};

export default function ShippingPolicyPage() {
  return (
    <PublicShell>
      <LegalPolicyLayout title="Shipping policy">
        <p>
          Orders on <strong className="text-ev-text">{publicBrandName}</strong> are fulfilled by the partner shop that
          listed the product. Estimated dispatch and delivery timelines, carriers, and any shipping fees are shown or
          confirmed at checkout where applicable.
        </p>
        <p>
          <strong className="text-ev-text">Tracking.</strong> When a shop generates a shipment, tracking details (AWB
          and carrier) are attached to your order so you can follow delivery in <strong className="text-ev-text">My orders</strong>.
        </p>
        <p>
          <strong className="text-ev-text">Delays.</strong> Weather, remote locations, or carrier disruptions may
          affect delivery. If your order is unusually delayed, contact us from the footer with your order ID.
        </p>
      </LegalPolicyLayout>
    </PublicShell>
  );
}
