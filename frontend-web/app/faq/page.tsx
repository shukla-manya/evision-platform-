import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { PublicShell } from '@/components/public/PublicShell';
import { publicBrandName } from '@/lib/public-brand';
import { publicAdminRegisterUrl, publicAdminSignInUrl, publicLoginPath, publicRegisterPath } from '@/lib/public-links';

export const metadata: Metadata = {
  title: `FAQs — ${publicBrandName}`,
  description: `Common questions about shopping, accounts, dealers, technicians, and shop admin on ${publicBrandName}.`,
};

type FaqItem = { q: string; a: ReactNode };

const SECTIONS: { title: string; items: FaqItem[] }[] = [
  {
    title: 'Account & sign-in',
    items: [
      {
        q: 'How do I sign in?',
        a: (
          <>
            Customers, dealers, and technicians use{' '}
            <Link href={publicLoginPath} className="text-ev-primary hover:text-ev-primary-light font-medium">
              Sign in
            </Link>{' '}
            with your mobile number and a one-time password (OTP). We detect your role from your account—no separate
            “I am a dealer” step at login.
          </>
        ),
      },
      {
        q: 'How do I create an account?',
        a: (
          <>
            Use{' '}
            <Link href={publicRegisterPath} className="text-ev-primary hover:text-ev-primary-light font-medium">
              Sign up
            </Link>{' '}
            and choose Customer, Dealer, Technician, or Shop owner. Each path asks for the details we need for that
            role.
          </>
        ),
      },
      {
        q: 'I run a shop on the platform. Where do I sign in?',
        a: (
          <>
            Shop admins use a separate sign-in with{' '}
            <strong className="text-ev-text">email and password</strong>, not mobile OTP. Use{' '}
            <a href={publicAdminSignInUrl} className="text-ev-primary hover:text-ev-primary-light font-medium">
              Admin sign in
            </a>{' '}
            (opens the admin site). New shops can{' '}
            <a href={publicAdminRegisterUrl} className="text-ev-primary hover:text-ev-primary-light font-medium">
              register
            </a>{' '}
            there or from the mobile app.
          </>
        ),
      },
    ],
  },
  {
    title: 'Shopping & orders',
    items: [
      {
        q: 'How do I pay?',
        a: 'Checkout uses Razorpay. You complete payment on the secure Razorpay flow; we never store your full card details on our servers.',
      },
      {
        q: 'When will my order ship?',
        a: 'Each product is fulfilled by a partner shop. After payment is confirmed, the shop prepares and ships your order. Tracking and courier details appear on your order when the shop creates a shipment.',
      },
      {
        q: 'Can I cancel an order?',
        a: 'Cancellation rules depend on order status and shop policy. Open your order in Orders to see available actions, or contact support if you need help.',
      },
    ],
  },
  {
    title: 'Dealers & GST',
    items: [
      {
        q: 'How do dealer prices work?',
        a: 'Registered dealers with a verified GST number can see wholesale-style pricing where the catalogue supports it. Retail prices apply for customers and when GST is not on file.',
      },
      {
        q: 'My GST is pending—what happens?',
        a: 'Until GST is verified, you may see retail pricing or limited dealer features. Complete your GST details in your account and allow time for verification.',
      },
    ],
  },
  {
    title: 'Technicians (on-site service)',
    items: [
      {
        q: 'How do I book a technician?',
        a: (
          <>
            From the site or app, use{' '}
            <Link href="/service/request" className="text-ev-primary hover:text-ev-primary-light font-medium">
              Book a technician
            </Link>{' '}
            and describe the issue. You will be matched with an available technician according to your area and
            schedule.
          </>
        ),
      },
      {
        q: 'How do I apply as a technician?',
        a: (
          <>
            Use{' '}
            <Link href="/register?role=electrician" className="text-ev-primary hover:text-ev-primary-light font-medium">
              Join as technician
            </Link>{' '}
            (or the Technician tab on registration). You submit documents and location; after approval you can sign in
            with OTP like other roles.
          </>
        ),
      },
    ],
  },
  {
    title: 'Shops & catalogue',
    items: [
      {
        q: 'Who sells the products?',
        a: 'Approved partner shops list their own inventory and prices (within platform rules). Your contract for a product is with the fulfilling shop shown at checkout.',
      },
      {
        q: 'Are deals and brands the same everywhere?',
        a: 'Promotions and brand availability can vary by shop and stock. Check the product page and shop details before you buy.',
      },
    ],
  },
];

export default function FaqPage() {
  return (
    <PublicShell>
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <p className="text-ev-muted text-sm font-medium uppercase tracking-wide mb-2">Help</p>
        <h1 className="text-3xl sm:text-4xl font-bold text-ev-text mb-4">Frequently asked questions</h1>
        <p className="text-ev-muted leading-relaxed mb-10">
          Quick answers about {publicBrandName}. For account-specific issues, use{' '}
          <Link href="/contact" className="text-ev-primary hover:text-ev-primary-light font-medium">
            Contact us
          </Link>{' '}
          on our About page.
        </p>

        <div className="space-y-10">
          {SECTIONS.map((section) => (
            <section key={section.title}>
              <h2 className="text-lg font-semibold text-ev-text mb-4 pb-2 border-b border-ev-border">{section.title}</h2>
              <ul className="space-y-4">
                {section.items.map((item) => (
                  <li key={item.q}>
                    <div className="ev-card p-5 sm:p-6">
                      <h3 className="font-semibold text-ev-text text-base">{item.q}</h3>
                      <div className="text-ev-muted text-sm mt-3 leading-relaxed">{item.a}</div>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <div className="mt-12 flex flex-wrap gap-3">
          <Link href="/shop" className="ev-btn-primary text-sm">
            Browse shop
          </Link>
          <Link href="/about" className="ev-btn-secondary text-sm">
            About us
          </Link>
        </div>
      </main>
    </PublicShell>
  );
}
