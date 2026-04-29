'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  Heart,
  Home,
  Loader2,
  Package,
  ShoppingCart,
  Store,
  User,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { authApi } from '@/lib/api';
import { getRole, isLoggedIn, redirectByRole } from '@/lib/auth';
import { PublicShell } from '@/components/public/PublicShell';
import { personalizedTimeGreetingIstWithWave } from '@/lib/time-greeting';

const TILES = [
  { href: '/shop', label: 'Shop', desc: 'Browse approved stores and products', Icon: Store },
  { href: '/orders', label: 'My orders', desc: 'Track payments and shipments', Icon: Package },
  { href: '/cart', label: 'Cart', desc: 'Review items before checkout', Icon: ShoppingCart },
  { href: '/wishlist', label: 'Wishlist', desc: 'Saved products', Icon: Heart },
  { href: '/profile', label: 'Profile', desc: 'Addresses and preferences', Icon: User },
  { href: '/', label: 'Storefront home', desc: 'Marketing highlights and how the platform works', Icon: Home },
] as const;

export default function CustomerDashboardPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [firstName, setFirstName] = useState<string | undefined>();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!isLoggedIn()) {
      router.replace('/login');
      return;
    }
    const r = getRole();
    if (!r) {
      router.replace('/login');
      return;
    }
    if (r !== 'customer') {
      router.replace(redirectByRole(r));
      return;
    }
    setReady(true);
  }, [router]);

  const load = useCallback(async () => {
    try {
      const { data } = await authApi.me();
      const u = (data as { user?: { name?: string } })?.user;
      setFirstName(u?.name?.trim().split(/\s+/)[0]);
    } catch {
      toast.error('Could not load profile');
    }
  }, []);

  useEffect(() => {
    if (!ready) return;
    void load();
  }, [ready, load]);

  if (!ready) {
    return (
      <PublicShell>
        <main className="max-w-5xl mx-auto px-4 py-24 flex justify-center items-center gap-2 text-ev-muted">
          <Loader2 className="animate-spin text-ev-primary" size={22} aria-hidden />
          <span>Loading…</span>
        </main>
      </PublicShell>
    );
  }

  return (
    <PublicShell>
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-10 sm:py-12">
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-ev-text">
            {personalizedTimeGreetingIstWithWave(firstName, { whenEmpty: 'there' })}
          </h1>
          <p className="text-ev-muted text-sm mt-2 max-w-2xl leading-relaxed">
            Your account hub after sign-in. The public homepage is unchanged — open{' '}
            <Link href="/" className="text-ev-primary font-medium hover:underline">
              Storefront home
            </Link>{' '}
            whenever you want the full marketing experience.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {TILES.map(({ href, label, desc, Icon }) => (
            <Link
              key={href}
              href={href}
              className="ev-card p-5 hover:border-ev-primary/35 transition-colors group focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ev-primary"
            >
              <Icon className="text-ev-primary mb-3" size={22} aria-hidden />
              <h2 className="font-semibold text-ev-text flex items-center gap-1">
                {label}
                <ArrowRight
                  size={14}
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-ev-primary shrink-0"
                  aria-hidden
                />
              </h2>
              <p className="text-ev-muted text-sm mt-1 leading-relaxed">{desc}</p>
            </Link>
          ))}
        </div>
      </main>
    </PublicShell>
  );
}
