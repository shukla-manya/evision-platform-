'use client';

import Link from 'next/link';
import { Camera, ArrowRight } from 'lucide-react';

const trending = [
  { emoji: '📷', name: 'Canon EOS R50', price: 'From ₹54,990' },
  { emoji: '🎥', name: 'Sony ZV-E10', price: 'From ₹62,490' },
  { emoji: '🔭', name: 'Sigma 50mm f/1.4', price: 'From ₹44,000' },
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-ev-bg overflow-x-hidden">
      <header className="ev-header z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          <Link href="/" className="flex items-center gap-2 shrink-0 min-w-0">
            <div className="w-9 h-9 bg-gradient-primary rounded-lg flex items-center justify-center shadow-ev-glow shrink-0">
              <Camera size={18} className="text-white" />
            </div>
            <span className="text-white font-bold text-lg tracking-tight truncate">LensCart</span>
          </Link>

          <nav
            className="flex items-center gap-4 sm:gap-6 text-sm text-white/75 overflow-x-auto max-w-[55vw] sm:max-w-none no-scrollbar"
            aria-label="Primary"
          >
            <Link href="/shop" className="hover:text-white whitespace-nowrap shrink-0 transition-colors">
              Shop
            </Link>
            <Link href="/#trending" className="hover:text-white whitespace-nowrap shrink-0 transition-colors">
              Deals
            </Link>
            <Link href="/login" className="hover:text-white whitespace-nowrap shrink-0 transition-colors">
              Service
            </Link>
          </nav>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <Link
              href="/login"
              className="text-white/90 text-sm font-medium px-3 py-2 rounded-lg hover:bg-white/10 transition-colors hidden xs:inline"
            >
              Sign in
            </Link>
            <Link href="/register" className="text-white/90 text-sm font-medium px-3 py-2 rounded-lg hover:bg-white/10 transition-colors sm:hidden">
              Register
            </Link>
            <Link href="/login" className="text-white/90 text-sm font-medium px-3 py-2 rounded-lg hover:bg-white/10 transition-colors sm:hidden">
              Sign in
            </Link>
            <Link href="/register" className="ev-btn-primary text-sm py-2 px-4 hidden sm:inline-flex">
              Register
            </Link>
            <Link href="/login" className="ev-btn-secondary text-sm py-2 px-4 hidden sm:inline-flex border-0">
              Sign in
            </Link>
          </div>
        </div>
      </header>

      <section className="relative px-4 sm:px-6 pt-16 pb-20 md:pt-20 md:pb-24">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-16 left-1/4 w-80 h-80 bg-ev-primary/8 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-72 h-72 bg-ev-accent/6 rounded-full blur-3xl" />
        </div>

        <div className="max-w-3xl mx-auto text-center relative z-10">
          <p className="text-ev-primary font-semibold text-sm uppercase tracking-widest mb-4">New arrivals</p>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-ev-text tracking-tight leading-[1.1] mb-4">
            Professional Cameras
            <br />
            <span className="gradient-text">&amp; Accessories</span>
          </h1>
          <p className="text-ev-muted text-lg md:text-xl max-w-xl mx-auto mb-10 leading-relaxed">
            Shop from 4 expert stores. Best prices for buyers and dealers.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center items-stretch sm:items-center">
            <Link href="/shop" className="ev-btn-primary inline-flex items-center justify-center gap-2 text-base py-3.5 px-8">
              Shop now <ArrowRight size={18} />
            </Link>
            <Link
              href="/#trending"
              className="ev-btn-secondary inline-flex items-center justify-center gap-2 text-base py-3.5 px-8"
            >
              Browse deals
            </Link>
          </div>
        </div>
      </section>

      <section id="trending" className="px-4 sm:px-6 pb-20 scroll-mt-20">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-ev-text text-center mb-10">Trending products</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {trending.map((item) => (
              <Link
                key={item.name}
                href="/shop"
                className="ev-card p-6 text-center hover:border-ev-primary/40 hover:shadow-ev-md transition-all duration-300 group"
              >
                <div className="text-4xl mb-4" aria-hidden>
                  {item.emoji}
                </div>
                <h3 className="text-ev-text font-semibold text-lg mb-2 group-hover:text-ev-primary transition-colors">{item.name}</h3>
                <p className="text-ev-muted font-medium">{item.price}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 sm:px-6 pb-20">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="ev-card p-8 md:p-10 bg-ev-surface border-ev-border flex flex-col items-start">
            <h2 className="text-xl md:text-2xl font-bold text-ev-text mb-2">Are you a dealer?</h2>
            <p className="text-ev-muted text-sm md:text-base mb-6 flex-1">Get exclusive bulk pricing</p>
            <Link href="/register?role=dealer" className="ev-btn-primary inline-flex items-center gap-2">
              Register as dealer <ArrowRight size={16} />
            </Link>
          </div>
          <div className="ev-card p-8 md:p-10 bg-ev-surface border-ev-border flex flex-col items-start">
            <h2 className="text-xl md:text-2xl font-bold text-ev-text mb-2">Electrician / Technician?</h2>
            <p className="text-ev-muted text-sm md:text-base mb-6 flex-1">Join our service network</p>
            <Link href="/register?role=electrician" className="ev-btn-secondary inline-flex items-center gap-2">
              Join as technician <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      <footer className="ev-footer-bar">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-center sm:text-left">
          <div className="flex items-center justify-center gap-2 text-white/85">
            <Camera size={14} className="text-ev-primary-light shrink-0" aria-hidden />
            <span>© {new Date().getFullYear()} LensCart Pvt. Ltd., Faridabad, Haryana</span>
          </div>
          <span className="text-white/55 text-xs sm:text-sm">Developer: Manya Shukla, JNU New Delhi</span>
        </div>
      </footer>
    </main>
  );
}
