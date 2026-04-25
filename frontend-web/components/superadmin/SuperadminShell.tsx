'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Zap,
  LayoutDashboard,
  BarChart3,
  Clock,
  Store,
  User,
  LogOut,
  Loader2,
} from 'lucide-react';
import { superadminApi } from '@/lib/api';
import { clearAuth, getRole } from '@/lib/auth';

const nav = [
  { href: '/superadmin/dashboard', label: 'Home', icon: LayoutDashboard },
  { href: '/superadmin/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/superadmin/pending-admins', label: 'Pending admins', icon: Clock },
  { href: '/superadmin/pending-electricians', label: 'Pending electricians', icon: User },
  { href: '/superadmin/shops', label: 'All shops', icon: Store },
];

export function SuperadminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [pendingAdminCount, setPendingAdminCount] = useState(0);
  const [pendingElectricianCount, setPendingElectricianCount] = useState(0);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (getRole() !== 'superadmin') {
      router.replace('/superadmin/login');
      return;
    }
    Promise.all([
      superadminApi.getPendingAdmins().then((r) => setPendingAdminCount(Array.isArray(r.data) ? r.data.length : 0)),
      superadminApi
        .getPendingElectricians()
        .then((r) => setPendingElectricianCount(Array.isArray(r.data) ? r.data.length : 0)),
    ])
      .catch(() => {})
      .finally(() => setReady(true));
  }, [router]);

  if (!ready) {
    return (
      <div className="min-h-screen bg-ev-bg flex items-center justify-center text-ev-muted gap-2">
        <Loader2 className="animate-spin text-ev-primary" size={24} />
        Loading…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ev-bg flex">
      <aside className="ev-sidebar w-60 sm:w-64 flex flex-col fixed inset-y-0 z-30">
        <div className="p-5 border-b ev-sidebar-border">
          <Link href="/superadmin/dashboard" className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-gradient-primary rounded-lg flex items-center justify-center shadow-ev-glow shrink-0">
              <Zap size={18} className="text-white" />
            </div>
            <div>
              <p className="text-white font-bold text-sm">LensCart</p>
              <p className="ev-sidebar-muted text-xs">Superadmin</p>
            </div>
          </Link>
        </div>
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {nav.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || (href !== '/superadmin/dashboard' && pathname.startsWith(href));
            const badge =
              href === '/superadmin/pending-admins'
                ? pendingAdminCount
                : href === '/superadmin/pending-electricians'
                  ? pendingElectricianCount
                  : 0;
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  active ? 'ev-sidebar-link-active' : 'ev-sidebar-link'
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <Icon size={17} />
                  {label}
                </span>
                {badge > 0 ? (
                  <span className="bg-ev-warning text-ev-text text-[10px] font-bold px-1.5 py-0.5 rounded-full">{badge}</span>
                ) : null}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t ev-sidebar-border">
          <button
            type="button"
            onClick={() => {
              clearAuth();
              router.push('/superadmin/login');
            }}
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-white/65 hover:text-red-300 hover:bg-red-500/10 text-sm transition-colors"
          >
            <LogOut size={16} />
            Sign out
          </button>
        </div>
      </aside>
      <div className="flex-1 ml-60 sm:ml-64 min-h-screen overflow-y-auto">{children}</div>
    </div>
  );
}
