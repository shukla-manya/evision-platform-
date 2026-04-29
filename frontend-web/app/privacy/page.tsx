import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { PublicShell } from '@/components/public/PublicShell';
import { publicBrandName } from '@/lib/public-brand';
import { publicCompanyLegalName, publicSupportEmail } from '@/lib/public-contact';

export const metadata: Metadata = {
  title: `Privacy policy — ${publicBrandName}`,
  description: `How ${publicBrandName} collects, uses, and protects your personal information.`,
};

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="text-lg font-semibold text-ev-text mb-3 pb-2 border-b border-ev-border">{title}</h2>
      <div className="text-ev-muted text-sm leading-relaxed space-y-3">{children}</div>
    </section>
  );
}

export default function PrivacyPage() {
  return (
    <PublicShell>
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <p className="text-ev-muted text-sm font-medium uppercase tracking-wide mb-2">Legal</p>
        <h1 className="text-3xl sm:text-4xl font-bold text-ev-text mb-2">Privacy policy</h1>
        <p className="text-ev-subtle text-sm mb-10">Last updated: April 2026 · {publicCompanyLegalName}</p>

        <div className="ev-card p-6 sm:p-8 mb-10">
          <p className="text-ev-muted text-sm leading-relaxed">
            This policy describes how <strong className="text-ev-text">{publicBrandName}</strong> (“we”, “us”) handles
            personal data when you use our website, mobile apps, and related services. By using the services, you agree to
            this policy. If you do not agree, please do not use the services.
          </p>
        </div>

        <Section title="1. Who we are">
          <p>
            {publicBrandName} is operated by <strong className="text-ev-text">{publicCompanyLegalName}</strong>. For
            privacy-related requests, contact us at{' '}
            <a href={`mailto:${publicSupportEmail}`} className="text-ev-primary hover:text-ev-primary-light font-medium">
              {publicSupportEmail}
            </a>
            .
          </p>
        </Section>

        <Section title="2. Information we collect">
          <p>We may collect:</p>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <strong className="text-ev-text">Account and profile:</strong> name, email, mobile number, role (e.g.
              customer, dealer, technician), GST or business details where applicable, and documents you submit for
              verification.
            </li>
            <li>
              <strong className="text-ev-text">Orders and payments:</strong> order details, delivery address, payment
              status, and transaction references. Card payments are processed by our payment partner (PayU); we
              do not store full card numbers on our servers.
            </li>
            <li>
              <strong className="text-ev-text">Technical data:</strong> device type, approximate location when you use
              location-based features, IP address, cookies, and similar technologies needed to run and secure the
              platform.
            </li>
            <li>
              <strong className="text-ev-text">Communications:</strong> messages you send to support or to partner shops
              through the platform, where those features exist.
            </li>
          </ul>
        </Section>

        <Section title="3. How we use information">
          <ul className="list-disc pl-5 space-y-2">
            <li>To create and manage your account and authenticate you.</li>
            <li>To process orders, arrange delivery, and share necessary details with fulfilling shops and logistics partners.</li>
            <li>To verify dealer or technician eligibility and comply with law.</li>
            <li>To send service messages (e.g. order updates, OTPs) and, where allowed, marketing you can opt out of.</li>
            <li>To improve security, prevent fraud, and debug issues.</li>
            <li>To meet legal, tax, and accounting obligations.</li>
          </ul>
        </Section>

        <Section title="4. Sharing of information">
          <p>
            We share data only as needed to operate the marketplace: for example with <strong className="text-ev-text">partner shops</strong>{' '}
            that fulfil your order, <strong className="text-ev-text">payment processors</strong>, <strong className="text-ev-text">couriers</strong> for
            shipment, and <strong className="text-ev-text">cloud or messaging providers</strong> that host our infrastructure. We do not sell your
            personal data to third parties for their independent marketing.
          </p>
        </Section>

        <Section title="5. Cookies and similar technologies">
          <p>
            We use cookies and local storage where necessary for sign-in sessions, preferences, and analytics. You can
            control cookies through your browser settings; disabling some cookies may limit certain features.
          </p>
        </Section>

        <Section title="6. Data retention">
          <p>
            We keep information for as long as your account is active and as needed to resolve disputes, enforce
            agreements, and meet legal retention periods (including tax and invoicing rules).
          </p>
        </Section>

        <Section title="7. Your choices and rights">
          <p>
            Depending on applicable law, you may have the right to access, correct, or delete certain personal data, or
            to object to or restrict some processing. Contact us at the email above with your request. We may need to
            verify your identity before acting.
          </p>
        </Section>

        <Section title="8. Security">
          <p>
            We use reasonable technical and organisational measures to protect data. No method of transmission over the
            internet is 100% secure; we encourage strong passwords and safe use of your devices.
          </p>
        </Section>

        <Section title="9. Children">
          <p>
            Our services are not directed at children under the age required by local law to enter into contracts. We do
            not knowingly collect personal data from such children.
          </p>
        </Section>

        <Section title="10. Changes to this policy">
          <p>
            We may update this policy from time to time. We will post the revised version on this page and update the “Last
            updated” date. Material changes may be communicated by email or notice on the site where appropriate.
          </p>
        </Section>

        <div className="mt-12 flex flex-wrap gap-3">
          <Link href="/contact" className="ev-btn-primary text-sm">
            Contact us
          </Link>
          <Link href="/faq" className="ev-btn-secondary text-sm">
            FAQs
          </Link>
        </div>
      </main>
    </PublicShell>
  );
}
