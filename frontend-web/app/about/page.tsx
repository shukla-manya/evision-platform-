import type { Metadata } from 'next';
import Link from 'next/link';
import { PublicShell } from '@/components/public/PublicShell';
import { publicBrandName } from '@/lib/public-brand';

export const metadata: Metadata = {
  title: `About us — ${publicBrandName}`,
  description: `${publicBrandName} connects trusted camera shops, dealer pricing, and on-site technician services in one marketplace.`,
};

export default function AboutPage() {
  return (
    <PublicShell>
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <p className="text-ev-muted text-sm font-medium uppercase tracking-wide mb-2">Company</p>
        <h1 className="text-3xl sm:text-4xl font-bold text-ev-text mb-4">About {publicBrandName}</h1>
        <p className="text-ev-muted text-lg leading-relaxed mb-10">
          We bring together <strong className="text-ev-text">trusted partner shops</strong>,{' '}
          <strong className="text-ev-text">dealer pricing</strong> where GST applies, and{' '}
          <strong className="text-ev-text">on-site technicians</strong> so you can buy gear with confidence and get help when
          you need it—all in one place.
        </p>

        <div className="space-y-10">
          <section>
            <h2 className="text-lg font-semibold text-ev-text mb-3 pb-2 border-b border-ev-border">What we do</h2>
            <p className="text-ev-muted text-sm leading-relaxed mb-4">
              {publicBrandName} is a marketplace: approved shops list products and fulfil orders. Customers browse a shared
              catalogue, check out securely, and receive tracking when the shop ships. Dealers with verified GST can access
              appropriate wholesale-style pricing where the catalogue supports it.
            </p>
            <p className="text-ev-muted text-sm leading-relaxed">
              For installations and repairs, customers can book technicians through the same platform. Technicians apply
              separately, are reviewed by our team, and then use the same sign-in experience as other roles.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-ev-text mb-3 pb-2 border-b border-ev-border">Who we serve</h2>
            <ul className="text-ev-muted text-sm leading-relaxed space-y-2 list-disc pl-5">
              <li>
                <strong className="text-ev-text">Shoppers</strong> looking for cameras, lenses, and accessories from vetted
                sellers.
              </li>
              <li>
                <strong className="text-ev-text">Dealers and businesses</strong> who need transparent pricing and invoices for
                their purchases.
              </li>
              <li>
                <strong className="text-ev-text">Technicians</strong> who want to offer on-site service in covered areas.
              </li>
              <li>
                <strong className="text-ev-text">Shop owners</strong> who want to sell online with tools for products, orders,
                inventory, and invoices—on the web and in our mobile app.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-ev-text mb-3 pb-2 border-b border-ev-border">Payments & trust</h2>
            <p className="text-ev-muted text-sm leading-relaxed">
              Checkout is powered by <strong className="text-ev-text">Razorpay</strong>. We focus on clear order status,
              shipment tracking when provided by the shop and courier, and support channels so you are never left guessing
              about your purchase.
            </p>
          </section>

          <section className="ev-card p-6 sm:p-8">
            <h2 className="text-lg font-semibold text-ev-text mb-2">Get in touch</h2>
            <p className="text-ev-muted text-sm leading-relaxed mb-4">
              Questions about an order, your account, or partnering with us? Visit our contact page—we are happy to help.
            </p>
            <Link href="/contact" className="ev-btn-primary text-sm inline-flex">
              Contact us
            </Link>
          </section>
        </div>

        <div className="mt-12 flex flex-wrap gap-3">
          <Link href="/shop" className="ev-btn-secondary text-sm">
            Browse shop
          </Link>
          <Link href="/faq" className="ev-btn-secondary text-sm">
            FAQs
          </Link>
          <Link href="/privacy" className="ev-btn-secondary text-sm">
            Privacy policy
          </Link>
        </div>
      </main>
    </PublicShell>
  );
}
