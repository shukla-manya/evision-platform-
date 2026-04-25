'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Bolt,
  CircleDot,
  Clock3,
  Home,
  Loader2,
  LogOut,
  Star,
  UserRound,
  Wallet,
} from 'lucide-react';
import { electricianApi } from '@/lib/api';
import { clearAuth, getRole } from '@/lib/auth';

const NAV_ITEMS: Array<{
  href: string;
  label: string;
  icon: typeof Home;
  badge?: 'pending';
}> = [
  { href: '/electrician/dashboard', label: 'Home', icon: Home },
  { href: '/electrician/bookings/pending', label: 'Bookings', icon: Bolt, badge: 'pending' },
  { href: '/electrician/bookings/active', label: 'Active job', icon: CircleDot },
  { href: '/electrician/bookings/history', label: 'Job history', icon: Clock3 },
  { href: '/electrician/reviews', label: 'My reviews', icon: Star },
  { href: '/electrician/earnings', label: 'Earnings', icon: Wallet },
  { href: '/electrician/profile', label: 'Profile', icon: UserRound },
];

export function ElectricianShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [loadingBadge, setLoadingBadge] = useState(true);
  const [pendingCount, setPendingCount] = useState<number | null>(null);

  useEffect(() => {
    const role = getRole();
    if (!role) {
      router.replace('/electrician/login');
      return;
    }
    if (role !== 'electrician') {
      router.replace('/login');
    }
  }, [router]);

  useEffect(() => {
    let cancelled = false;
    electricianApi
      .pendingBookings()
      .then((res) => {
        if (cancelled) return;
        const rows = Array.isArray(res.data) ? (res.data as unknown[]) : [];
        setPendingCount(rows.length);
      })
      .catch(() => {
        if (!cancelled) setPendingCount(null);
      })
      .finally(() => {
        if (!cancelled) setLoadingBadge(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const logout = () => {
    clearAuth();
    router.push('/electrician/login');
  };

  return (
    <div className="min-h-screen bg-ev-bg flex">
      <aside className="ev-sidebar w-60 sm:w-64 flex flex-col fixed inset-y-0 z-30">
        <div className="p-5 border-b ev-sidebar-border">
          <Link href="/electrician/dashboard" className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-gradient-primary rounded-lg flex items-center justify-center shadow-ev-glow shrink-0">
              <Bolt size={18} className="text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-white font-bold text-sm truncate">Technician</p>
              <p className="ev-sidebar-muted text-xs">Field dashboard</p>
            </div>
          </Link>
        </div>
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.map(({ href, label, icon: Icon, badge }) => {
            const active = pathname === href;
            const showBadge = badge === 'pending' && !loadingBadge && (pendingCount ?? 0) > 0;
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  active ? 'ev-sidebar-link-active' : 'ev-sidebar-link'
                }`}
              >
                <Icon size={17} />
                <span className="flex-1 min-w-0 truncate">{label}</span>
                {badge === 'pending' && loadingBadge ? (
                  <Loader2 size={12} className="animate-spin text-white/60" />
                ) : null}
                {showBadge ? (
                  <span className="shrink-0 min-w-[1.25rem] h-5 px-1 flex items-center justify-center rounded-full bg-ev-primary text-white text-[10px] font-bold">
                    {(pendingCount ?? 0) > 99 ? '99+' : pendingCount}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t ev-sidebar-border">
          <button
            type="button"
            onClick={logout}
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-white/65 hover:text-red-300 hover:bg-red-500/10 text-sm transition-colors"
          >
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </aside>
      <main className="flex-1 ml-60 sm:ml-64 min-h-screen p-6 sm:p-10">{children}</main>
    </div>
  );
}
