'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Heart, Menu, Search, ShoppingCart, X } from 'lucide-react';
import { cartApi } from '@/lib/api';
import { clearAuth, getRole, isLoggedIn } from '@/lib/auth';
import { publicBrandName } from '@/lib/public-brand';
import { EvisionLogo } from '@/components/brand/EvisionLogo';
import { wishlistCount } from '@/lib/wishlist';

const NAV_LINKS = [
  { href: '/shop', label: 'Shop' },
  { href: '/deals', label: 'Deals' },
  { href: '/technician-services', label: 'Services' },
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
    queueMicrotask(() => setRole(getRole()));
  }, []);
  const canCart = role === 'customer' || role === 'dealer';
  const isShopper = role === 'customer' || role === 'dealer';
  const isTechnician = role === 'electrician' || role === 'electrician_pending' || role === 'electrician_rejected';

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
    queueMicrotask(() => void syncCounts());
    const onWish = () => void syncCounts();
    window.addEventListener('ev-wishlist', onWish);
    window.addEventListener('focus', syncCounts);
    return () => {
      window.removeEventListener('ev-wishlist', onWish);
      window.removeEventListener('focus', syncCounts);
    };
  }, [syncCounts]);

  useEffect(() => {
    const q = searchParams.get('search') || searchParams.get('q') || '';
    queueMicrotask(() => setQuery(q));
  }, [searchParams]);

  useEffect(() => {
    queueMicrotask(() => setMobileOpen(false));
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
    <header className="sticky top-0 z-50 ev-header border-b border-white/10 pt-[env(safe-area-inset-top)]">
      <div className="mx-auto flex min-h-14 max-w-7xl min-w-0 items-center gap-2 px-4 py-2 sm:min-h-16 sm:gap-3 sm:px-6">
        <Link href="/" className="flex shrink-0 items-center gap-2 min-w-0" aria-label={publicBrandName}>
          <EvisionLogo variant="full" wordmark={publicBrandName} height={32} tone="onDark" className="shrink-0" />
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
          {isShopper ? (
            <>
              <Link
                href="/home"
                className="hidden sm:inline-flex text-white/90 text-sm font-medium px-3 py-2 rounded-lg hover:bg-white/10 whitespace-nowrap"
              >
                Home
              </Link>
              <Link
                href="/orders"
                className="hidden sm:inline-flex text-white/90 text-sm font-medium px-3 py-2 rounded-lg hover:bg-white/10 whitespace-nowrap"
              >
                My orders
              </Link>
              {role === 'dealer' ? (
                <Link
                  href="/dealer/dashboard"
                  className="hidden sm:inline-flex text-white/90 text-sm font-medium px-3 py-2 rounded-lg hover:bg-white/10 whitespace-nowrap"
                >
                  Dealer hub
                </Link>
              ) : null}
              <Link
                href="/profile"
                className="hidden sm:inline-flex text-white/90 text-sm font-medium px-3 py-2 rounded-lg hover:bg-white/10 whitespace-nowrap"
              >
                Profile
              </Link>
              <button
                type="button"
                className="hidden sm:inline-flex text-white/80 text-sm font-medium px-3 py-2 rounded-lg hover:bg-white/10 whitespace-nowrap"
                onClick={() => {
                  clearAuth();
                  window.location.href = '/';
                }}
              >
                Sign out
              </button>
            </>
          ) : isTechnician ? (
            <>
              <Link
                href="/electrician/dashboard"
                className="hidden sm:inline-flex text-white/90 text-sm font-medium px-3 py-2 rounded-lg hover:bg-white/10 whitespace-nowrap"
              >
                Technician
              </Link>
              <button
                type="button"
                className="hidden sm:inline-flex text-white/80 text-sm font-medium px-3 py-2 rounded-lg hover:bg-white/10 whitespace-nowrap"
                onClick={() => {
                  clearAuth();
                  window.location.href = '/';
                }}
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="hidden sm:inline-flex text-white/90 text-sm font-medium px-3 py-2 rounded-lg hover:bg-white/10 transition-colors whitespace-nowrap"
              >
                Sign In
              </Link>
              <Link href="/register" className="hidden sm:inline-flex ev-btn-primary text-sm py-2 px-4 whitespace-nowrap">
                Register
              </Link>
            </>
          )}
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
          {isShopper ? (
            <>
              <Link href="/home" className="block py-2.5 text-white/85 hover:text-white font-medium">
                Home
              </Link>
              <Link href="/orders" className="block py-2.5 text-white/85 hover:text-white font-medium">
                My orders
              </Link>
              {role === 'dealer' ? (
                <Link href="/dealer/dashboard" className="block py-2.5 text-white/85 hover:text-white font-medium">
                  Dealer hub
                </Link>
              ) : null}
              <Link href="/profile" className="block py-2.5 text-white/85 hover:text-white font-medium">
                Profile
              </Link>
              <button
                type="button"
                className="block w-full text-left py-2.5 text-white/85 hover:text-white font-medium"
                onClick={() => {
                  clearAuth();
                  window.location.href = '/';
                }}
              >
                Sign out
              </button>
            </>
          ) : isTechnician ? (
            <>
              <Link
                href="/electrician/dashboard"
                className="block py-2.5 text-white/85 hover:text-white font-medium"
              >
                Technician
              </Link>
              <button
                type="button"
                className="block w-full text-left py-2.5 text-white/85 hover:text-white font-medium"
                onClick={() => {
                  clearAuth();
                  window.location.href = '/';
                }}
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="block py-2.5 text-white/85 hover:text-white font-medium">
                Sign In
              </Link>
              <Link href="/register" className="block py-2.5 text-ev-primary-light font-semibold">
                Register
              </Link>
            </>
          )}
        </div>
      ) : null}
    </header>
  );
}
