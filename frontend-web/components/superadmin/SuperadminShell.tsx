'use client';

import { useEffect, useLayoutEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  type LucideIcon,
  LayoutDashboard,
  BarChart3,
  Inbox,
  Store,
  UserCog,
  Wallet,
  Star,
  Mail,
  LogOut,
  Loader2,
  ClipboardCheck,
} from 'lucide-react';
import { superadminApi } from '@/lib/api';
import { clearAuth, getRole } from '@/lib/auth';
import { publicBrandName } from '@/lib/public-brand';
import { EvisionLogo } from '@/components/brand/EvisionLogo';
import { ResponsiveSidebarShell } from '@/components/layout/ResponsiveSidebarShell';

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  badgeKey?: 'pending_shops' | 'pending_techs' | 'pending_dealer_gst';
};

const nav: NavItem[] = [
  { href: '/super/dashboard', label: 'Overview', icon: LayoutDashboard },
  { href: '/super/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/super/shop-registrations', label: 'Shop registrations', icon: Inbox, badgeKey: 'pending_shops' },
  { href: '/super/technicians', label: 'Technicians', icon: UserCog, badgeKey: 'pending_techs' },
  { href: '/super/dealers', label: 'Dealer GST', icon: ClipboardCheck, badgeKey: 'pending_dealer_gst' },
  { href: '/super/shops', label: 'All shops', icon: Store },
  { href: '/super/settlements', label: 'Settlements', icon: Wallet },
  { href: '/super/reviews', label: 'Reviews', icon: Star },
  { href: '/super/email-logs', label: 'Email logs', icon: Mail },
];

export function SuperadminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [pendingAdminCount, setPendingAdminCount] = useState(0);
  const [pendingElectricianCount, setPendingElectricianCount] = useState(0);
  const [pendingDealerGstCount, setPendingDealerGstCount] = useState(0);
  /** null = auth not checked yet (brief); true = show shell; false = redirecting away */
  const [authorized, setAuthorized] = useState<boolean | null>(null);

  useLayoutEffect(() => {
    if (getRole() !== 'superadmin') {
      router.replace('/super/signin');
      setAuthorized(false);
      return;
    }
    setAuthorized(true);
  }, [router]);

  useEffect(() => {
    if (authorized !== true) return;
    void Promise.all([
      superadminApi.getPendingAdmins().then((r) => setPendingAdminCount(Array.isArray(r.data) ? r.data.length : 0)),
      superadminApi
        .getPendingElectricians()
        .then((r) => setPendingElectricianCount(Array.isArray(r.data) ? r.data.length : 0)),
      superadminApi
        .getPendingDealerGst()
        .then((r) => setPendingDealerGstCount(Array.isArray(r.data) ? r.data.length : 0)),
    ]).catch(() => {});
  }, [authorized]);

  if (authorized !== true) {
    return (
      <div className="min-h-screen bg-ev-bg flex items-center justify-center text-ev-muted gap-2">
        <Loader2 className="animate-spin text-ev-primary" size={24} />
        {authorized === false ? 'Redirecting…' : 'Loading…'}
      </div>
    );
  }

  const sidebar = (
    <>
      <div className="p-5 border-b ev-sidebar-border shrink-0">
        <Link href="/super/dashboard" className="flex items-center gap-2.5">
          <EvisionLogo variant="mark" height={36} className="shrink-0 shadow-ev-glow rounded-lg" />
          <div className="min-w-0">
            <p className="text-white font-bold text-sm tracking-tight truncate">{publicBrandName}</p>
            <p className="ev-sidebar-muted text-xs">Platform admin</p>
          </div>
        </Link>
      </div>
      <nav className="p-3 space-y-0.5">
        {nav.map(({ href, label, icon: Icon, badgeKey }) => {
          const active =
            href === '/super/dashboard' || href === '/super/analytics'
              ? pathname === href
              : pathname === href || pathname.startsWith(`${href}/`);
          const count =
            badgeKey === 'pending_shops'
              ? pendingAdminCount
              : badgeKey === 'pending_techs'
                ? pendingElectricianCount
                : badgeKey === 'pending_dealer_gst'
                  ? pendingDealerGstCount
                  : 0;
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                active ? 'ev-sidebar-link-active' : 'ev-sidebar-link'
              }`}
            >
              <span className="flex items-center gap-2.5 min-w-0">
                <Icon size={17} className="shrink-0" />
                <span className="truncate">{label}</span>
              </span>
              {badgeKey && count > 0 ? (
                <span className="bg-ev-warning text-ev-text text-[10px] font-bold min-w-[1.25rem] text-center px-1.5 py-0.5 rounded-full shrink-0">
                  {count}
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>
      <div className="p-3 border-t ev-sidebar-border shrink-0">
        <button
          type="button"
          onClick={() => {
            clearAuth();
            router.push('/super/signin');
          }}
          className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-white/65 hover:text-red-300 hover:bg-red-500/10 text-sm transition-colors"
        >
          <LogOut size={16} />
          Sign out
        </button>
      </div>
    </>
  );

  return (
    <ResponsiveSidebarShell mobileTopBarTitle={publicBrandName} sidebar={sidebar}>
      <div className="min-h-screen min-w-0 overflow-y-auto overflow-x-hidden [overflow-x:clip] supports-[overflow:clip]:overflow-x-clip">
        {children}
      </div>
    </ResponsiveSidebarShell>
  );
}
