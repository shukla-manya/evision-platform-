import type { Metadata } from 'next';
import { PublicShell } from '@/components/public/PublicShell';
import { LegalPolicyLayout } from '@/components/public/LegalPolicyLayout';
import { publicBrandName } from '@/lib/public-brand';

export const metadata: Metadata = {
  title: `Terms and conditions — ${publicBrandName}`,
  description: `Terms of use for ${publicBrandName} website, marketplace, and related services.`,
};

export default function TermsPage() {
  return (
    <PublicShell>
      <LegalPolicyLayout title="Terms and conditions">
        <p>
          These terms govern your use of <strong className="text-ev-text">{publicBrandName}</strong> and related services
          operated by E vision Pvt. Ltd. By accessing the site or placing an order, you agree to be bound by these terms
          and our policies linked in the site footer.
        </p>
        <p>
          <strong className="text-ev-text">Orders and marketplace.</strong> Products are listed by approved partner
          shops. Prices, availability, and fulfilment are set by the listing shop unless otherwise stated at checkout.
          Payment processing and order records are handled according to our checkout partner and applicable law.
        </p>
        <p>
          <strong className="text-ev-text">Changes.</strong> We may update these terms from time to time. The “Last
          updated” date at the top of this page will change when we do. Continued use after changes constitutes
          acceptance of the revised terms.
        </p>
        <p>
          For questions about these terms, please use <strong className="text-ev-text">Contact</strong> in the footer.
        </p>
      </LegalPolicyLayout>
    </PublicShell>
  );
}
