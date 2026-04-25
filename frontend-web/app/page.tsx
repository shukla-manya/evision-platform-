'use client';
import Link from 'next/link';
import { Camera, ShoppingBag, Wrench, Users, ArrowRight, CheckCircle } from 'lucide-react';

const features = [
  { icon: ShoppingBag, title: 'Trusted sellers', desc: 'Browse bodies, lenses, and accessories from verified shops in one cart and one checkout.' },
  { icon: Camera, title: 'Gear for every shoot', desc: 'From entry-level kits to pro setups — compare stock, pricing, and shop policies in one place.' },
  { icon: Users, title: 'Dealer-friendly', desc: 'Bulk-friendly pricing and GST-ready invoices where your account type supports it.' },
  { icon: Wrench, title: 'Service when you need it', desc: 'Book verified technicians for installs, repairs, and support after your gear arrives.' },
];

const steps = [
  'Browse multiple shops in one catalogue',
  'Single payment, split per seller',
  'Track each shipment to your door',
  'Book service after delivery',
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-ev-bg overflow-x-hidden">
      <nav className="ev-header z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center shadow-ev-glow">
              <Camera size={18} className="text-white" />
            </div>
            <span className="text-white font-bold text-lg tracking-tight">LensCart</span>
            <span className="text-white/45 text-xs hidden sm:block">Marketplace</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/shop" className="text-white/70 hover:text-white text-sm transition-colors">
              Shop
            </Link>
            <Link href="/admin/register" className="text-white/70 hover:text-white text-sm transition-colors">
              Sell on LensCart
            </Link>
            <Link href="/login" className="ev-btn-primary text-sm py-2 px-5">
              Sign In
            </Link>
          </div>
        </div>
      </nav>

      <section className="relative pt-24 pb-20 px-6 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-20 left-1/4 w-96 h-96 bg-ev-primary/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-ev-accent/8 rounded-full blur-3xl" />
        </div>

        <div className="max-w-4xl mx-auto text-center relative z-10 animate-fade-in">
          <div className="inline-flex items-center gap-2 bg-ev-surface border border-ev-border rounded-full px-4 py-1.5 text-sm text-ev-muted mb-8">
            <span className="w-1.5 h-1.5 bg-ev-success rounded-full animate-pulse" />
            Warm, clean shopping for camera gear
          </div>

          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 leading-[1.08]">
            <span className="text-ev-text">Your trusted</span>
            <br />
            <span className="gradient-text">camera marketplace</span>
          </h1>

          <p className="text-ev-muted text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
            Shop gear from curated sellers, track every delivery, and book help when you need it — built for clarity and confidence.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/register" className="ev-btn-primary flex items-center justify-center gap-2 text-base py-3.5 px-8">
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

      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold text-ev-text mb-3">
              Everything you need
            </h2>
            <p className="text-ev-muted text-lg">For shoppers, dealers, and service partners</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="ev-card p-6 hover:border-ev-primary/40 hover:shadow-ev-md transition-all duration-300 group">
                <div className="w-12 h-12 bg-ev-primary/10 rounded-xl flex items-center justify-center mb-4 group-hover:bg-ev-primary/18 transition-colors">
                  <Icon size={22} className="text-ev-primary" />
                </div>
                <h3 className="text-ev-text font-semibold mb-2">{title}</h3>
                <p className="text-ev-muted text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 px-6">
        <div className="max-w-3xl mx-auto">
          <div className="rounded-2xl border border-white/15 p-10 text-center bg-gradient-ev shadow-ev-lg text-white">
            <div className="w-14 h-14 bg-gradient-primary rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-ev-glow">
              <Camera size={28} className="text-white" />
            </div>
            <h2 className="text-3xl font-bold text-white mb-3">Sell camera gear?</h2>
            <p className="text-white/80 mb-8 text-lg">
              Join LensCart as a shop admin, list your catalogue, and reach buyers with a clean storefront experience.
            </p>
            <Link href="/admin/register" className="ev-btn-primary inline-flex items-center gap-2 text-base py-3.5 px-8">
              Apply to Join <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>

      <footer className="ev-footer-bar">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Camera size={14} className="text-ev-primary-light shrink-0" />
            <span>© 2024 LensCart Pvt. Ltd., Faridabad, Haryana</span>
          </div>
          <div className="flex gap-6 text-white/60">
            <span>Developer: Manya Shukla, JNU New Delhi</span>
          </div>
        </div>
      </footer>
    </main>
  );
}
