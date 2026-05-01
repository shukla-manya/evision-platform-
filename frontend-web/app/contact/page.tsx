import type { Metadata } from 'next';
import { PublicShell } from '@/components/public/PublicShell';
import { ContactPageContent } from '@/components/public/ContactPageContent';
import { publicBrandName } from '@/lib/public-brand';

export const metadata: Metadata = {
  title: `Contact — ${publicBrandName}`,
  description: `Contact ${publicBrandName}: message our team, join the newsletter (thank-you + team emails), and find support details.`,
};

export default function ContactPage() {
  return (
    <PublicShell>
      <ContactPageContent />
    </PublicShell>
  );
}
