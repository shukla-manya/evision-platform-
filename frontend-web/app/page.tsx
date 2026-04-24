'use client';
import Link from 'next/link';
import { Zap, ShoppingBag, Wrench, Users, ArrowRight, CheckCircle } from 'lucide-react';

const features = [
  { icon: ShoppingBag, title: 'Multi-Shop Marketplace', desc: 'Browse products from 4 curated electrical shops. Add to a unified cart and checkout in one payment.' },
  { icon: Wrench, title: 'Electrician Services', desc: 'Book verified electricians within 10km. Live tracking on visit day. Leave reviews after job completion.' },
  { icon: Users, title: 'Dealer Portal', desc: 'Bulk ordering with GST-formatted invoices. Exclusive dealer pricing hidden from regular customers.' },
  { icon: Zap, title: 'Real-Time Tracking', desc: 'Live shipment status via Shiprocket. Electrician location on Google Maps during service visits.' },
];

const steps = [
  'Browse all 4 shops in one place',
  'Single payment, auto-split per shop',
  'Track each shipment individually',
  'Book electricians post-delivery',
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-ev-bg overflow-x-hidden">
      {/* Nav */}
      <nav className="border-b border-ev-border bg-ev-surface/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center shadow-ev-glow">
              <Zap size={18} className="text-white" />
            </div>
            <span className="text-ev-text font-bold text-lg tracking-tight">E Vision</span>
            <span className="text-ev-subtle text-xs hidden sm:block">Pvt. Ltd.</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/shop" className="text-ev-muted hover:text-ev-text text-sm transition-colors">
              Shop
            </Link>
            <Link href="/admin/register" className="text-ev-muted hover:text-ev-text text-sm transition-colors">
              Register Shop
            </Link>
            <Link href="/auth/login" className="ev-btn-primary text-sm py-2 px-5">
              Sign In
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-24 pb-20 px-6 overflow-hidden">
        {/* Background glow effects */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-20 left-1/4 w-96 h-96 bg-ev-primary/8 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-ev-accent/6 rounded-full blur-3xl" />
        </div>

        <div className="max-w-4xl mx-auto text-center relative z-10 animate-fade-in">
          <div className="inline-flex items-center gap-2 bg-ev-surface border border-ev-border rounded-full px-4 py-1.5 text-sm text-ev-muted mb-8">
            <span className="w-1.5 h-1.5 bg-ev-success rounded-full animate-pulse" />
            Faridabad, Haryana — Proudly serving since 2024
          </div>

          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 leading-[1.08]">
            <span className="text-ev-text">Your complete</span>
            <br />
            <span className="gradient-text">electrical ecosystem</span>
          </h1>

          <p className="text-ev-muted text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
            Shop from multiple electrical stores, track deliveries, and book verified electricians — all in one platform built for Faridabad and beyond.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/auth/register" className="ev-btn-primary flex items-center justify-center gap-2 text-base py-3.5 px-8">
              Get Started <ArrowRight size={18} />
            </Link>
            <Link href="/admin/register" className="ev-btn-secondary flex items-center justify-center gap-2 text-base py-3.5 px-8">
              Register Your Shop
            </Link>
          </div>

          <div className="flex flex-wrap gap-x-6 gap-y-2 justify-center mt-10">
            {steps.map((step, i) => (
              <div key={i} className="flex items-center gap-2 text-ev-muted text-sm">
                <CheckCircle size={14} className="text-ev-success shrink-0" />
                {step}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold text-ev-text mb-3">
              Everything you need
            </h2>
            <p className="text-ev-muted text-lg">Built for customers, dealers, and service professionals</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="ev-card p-6 hover:border-ev-primary/50 hover:shadow-ev-glow transition-all duration-300 group">
                <div className="w-12 h-12 bg-ev-primary/10 rounded-xl flex items-center justify-center mb-4 group-hover:bg-ev-primary/20 transition-colors">
                  <Icon size={22} className="text-ev-primary" />
                </div>
                <h3 className="text-ev-text font-semibold mb-2">{title}</h3>
                <p className="text-ev-muted text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6">
        <div className="max-w-3xl mx-auto">
          <div className="ev-card p-10 text-center bg-gradient-ev shadow-ev-lg">
            <div className="w-14 h-14 bg-gradient-primary rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-ev-glow">
              <Zap size={28} className="text-white" />
            </div>
            <h2 className="text-3xl font-bold text-ev-text mb-3">Own an electrical shop?</h2>
            <p className="text-ev-muted mb-8 text-lg">
              Join E Vision as an admin, list your products, and start reaching customers across Faridabad.
              Superadmin approval within 24 hours.
            </p>
            <Link href="/admin/register" className="ev-btn-primary inline-flex items-center gap-2 text-base py-3.5 px-8">
              Apply to Join <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-ev-border py-8 px-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-ev-subtle text-sm">
          <div className="flex items-center gap-2">
            <Zap size={14} className="text-ev-primary" />
            <span>© 2024 E Vision Pvt. Ltd., Faridabad, Haryana</span>
          </div>
          <div className="flex gap-6">
            <span>Developer: Manya Shukla, JNU New Delhi</span>
          </div>
        </div>
      </footer>
    </main>
  );
}
