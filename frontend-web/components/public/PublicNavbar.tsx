'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Camera, Heart, Menu, Search, ShoppingCart, X } from 'lucide-react';
import { cartApi } from '@/lib/api';
import { getRole, isLoggedIn } from '@/lib/auth';
import { publicBrandName } from '@/lib/public-brand';
import { wishlistCount } from '@/lib/wishlist';

const NAV_LINKS = [
  { href: '/shop', label: 'Shop' },
  { href: '/deals', label: 'Deals' },
  { href: '/brands', label: 'Brands' },
  { href: '/technician-services', label: 'Technician Services' },
  { href: '/about', label: 'About Us' },
] as const;

export function PublicNavbar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [cartItems, setCartItems] = useState(0);
  const [hearts, setHearts] = useState(0);

  const [role, setRole] = useState<string | undefined>(undefined);
  useEffect(() => {
    setRole(getRole());
  }, []);
  const canCart = role === 'customer' || role === 'dealer';

  const syncCounts = useCallback(() => {
    setHearts(wishlistCount());
    if (!canCart || !isLoggedIn()) {
      setCartItems(0);
      return;
    }
    cartApi
      .getCart()
      .then((res) => {
        const n = Number((res.data as { total_items?: number })?.total_items ?? 0);
        setCartItems(Number.isFinite(n) ? n : 0);
      })
      .catch(() => setCartItems(0));
  }, [canCart]);

  useEffect(() => {
    syncCounts();
    const onWish = () => syncCounts();
    window.addEventListener('ev-wishlist', onWish);
    window.addEventListener('focus', syncCounts);
    return () => {
      window.removeEventListener('ev-wishlist', onWish);
      window.removeEventListener('focus', syncCounts);
    };
  }, [syncCounts]);

  useEffect(() => {
    const q = searchParams.get('search') || searchParams.get('q') || '';
    setQuery(q);
  }, [searchParams]);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (pathname.startsWith('/shop')) {
      const p = new URLSearchParams(searchParams.toString());
      if (q) p.set('search', q);
      else p.delete('search');
      router.push(`/shop?${p.toString()}`);
    } else {
      router.push(q ? `/shop?search=${encodeURIComponent(q)}` : '/shop');
    }
  }

  return (
    <header className="sticky top-0 z-50 ev-header border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 min-h-16 flex items-center gap-3 py-2">
        <Link href="/" className="flex items-center gap-2 shrink-0 min-w-0">
          <div className="w-9 h-9 bg-gradient-primary rounded-lg flex items-center justify-center shadow-ev-glow shrink-0">
            <Camera size={18} className="text-white" />
          </div>
          <span className="text-white font-bold text-lg tracking-tight truncate">{publicBrandName}</span>
        </Link>

        <nav className="hidden lg:flex items-center gap-6 text-sm text-white/75 ml-4" aria-label="Primary">
          {NAV_LINKS.map(({ href, label }) => (
            <Link key={href} href={href} className="hover:text-white whitespace-nowrap transition-colors">
              {label}
            </Link>
          ))}
        </nav>

        <form onSubmit={submitSearch} className="hidden md:flex flex-1 max-w-xl mx-4">
          <div className="relative w-full">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search for cameras, lenses, accessories…"
              className="w-full rounded-xl bg-white/10 border border-white/15 text-white placeholder:text-white/45 text-sm pl-10 pr-3 py-2.5 outline-none focus:border-ev-primary focus:ring-1 focus:ring-ev-primary/40"
            />
          </div>
        </form>

        <div className="flex items-center gap-1 sm:gap-2 ml-auto shrink-0">
          <Link
            href="/wishlist"
            className="p-2 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors relative"
            aria-label="Wishlist"
          >
            <Heart size={20} />
            {hearts > 0 ? (
              <span className="absolute -top-0.5 -right-0.5 min-w-[1.1rem] h-[1.1rem] px-0.5 flex items-center justify-center rounded-full bg-ev-primary text-[10px] font-bold text-white">
                {hearts > 99 ? '99+' : hearts}
              </span>
            ) : null}
          </Link>
          <Link
            href="/cart"
            className="p-2 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors relative"
            aria-label="Cart"
          >
            <ShoppingCart size={20} />
            {cartItems > 0 ? (
              <span className="absolute -top-0.5 -right-0.5 min-w-[1.1rem] h-[1.1rem] px-0.5 flex items-center justify-center rounded-full bg-ev-primary text-[10px] font-bold text-white">
                {cartItems > 99 ? '99+' : cartItems}
              </span>
            ) : null}
          </Link>
          <Link
            href="/login"
            className="hidden sm:inline-flex text-white/90 text-sm font-medium px-3 py-2 rounded-lg hover:bg-white/10 transition-colors whitespace-nowrap"
          >
            Sign In
          </Link>
          <Link href="/register" className="hidden sm:inline-flex ev-btn-primary text-sm py-2 px-4 whitespace-nowrap">
            Register
          </Link>
          <button
            type="button"
            className="lg:hidden p-2 rounded-lg text-white/85 hover:bg-white/10"
            aria-expanded={mobileOpen}
            aria-label="Menu"
            onClick={() => setMobileOpen((o) => !o)}
          >
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      <form onSubmit={submitSearch} className="md:hidden px-4 pb-3">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search cameras, lenses…"
            className="w-full rounded-xl bg-white/10 border border-white/15 text-white placeholder:text-white/45 text-sm pl-10 pr-3 py-2.5 outline-none focus:border-ev-primary"
          />
        </div>
      </form>

      {mobileOpen ? (
        <div className="lg:hidden border-t border-white/10 bg-ev-navbar px-4 py-4 space-y-1">
          {NAV_LINKS.map(({ href, label }) => (
            <Link key={href} href={href} className="block py-2.5 text-white/85 hover:text-white font-medium">
              {label}
            </Link>
          ))}
          <Link href="/login" className="block py-2.5 text-white/85 hover:text-white font-medium">
            Sign In
          </Link>
          <Link href="/register" className="block py-2.5 text-ev-primary-light font-semibold">
            Register
          </Link>
        </div>
      ) : null}
    </header>
  );
}
