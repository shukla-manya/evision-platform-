'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Zap,
  LayoutDashboard,
  Package,
  ShoppingCart,
  FileText,
  Settings,
  LogOut,
  Loader2,
} from 'lucide-react';
import { adminApi } from '@/lib/api';
import { clearAuth, getRole } from '@/lib/auth';

type AdminMe = {
  shop_name?: string;
  owner_name?: string;
  status?: string;
};

const nav = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/products', label: 'Products', icon: Package },
  { href: '/admin/orders', label: 'Orders', icon: ShoppingCart },
  { href: '/admin/invoices', label: 'Invoices', icon: FileText },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [admin, setAdmin] = useState<AdminMe | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (getRole() !== 'admin') {
      router.replace('/admin/login');
      return;
    }
    adminApi
      .getMe()
      .then((r) => setAdmin(r.data as AdminMe))
      .catch(() => router.replace('/admin/login'))
      .finally(() => setLoading(false));
  }, [router]);

  useEffect(() => {
    if (admin?.status === 'pending' && pathname !== '/admin/dashboard') {
      router.replace('/admin/dashboard');
    }
  }, [admin, pathname, router]);

  if (loading) {
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
          <Link href="/admin/dashboard" className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-gradient-primary rounded-lg flex items-center justify-center shadow-ev-glow shrink-0">
              <Zap size={18} className="text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-white font-bold text-sm truncate">LensCart</p>
              <p className="ev-sidebar-muted text-xs">Shop Admin</p>
            </div>
          </Link>
          {admin ? (
            <div className="mt-4 rounded-xl bg-white/5 p-3 border ev-sidebar-border">
              <p className="text-white text-sm font-semibold truncate">{admin.shop_name}</p>
              <p className="text-white/60 text-xs truncate">{admin.owner_name}</p>
              <span
                className={`inline-block mt-2 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full border ${
                  admin.status === 'approved'
                    ? 'bg-ev-success/10 text-ev-success border-ev-success/25'
                    : 'bg-ev-warning/10 text-ev-warning border-ev-warning/25'
                }`}
              >
                {admin.status}
              </span>
            </div>
          ) : null}
        </div>
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {nav.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || (href !== '/admin/dashboard' && pathname.startsWith(href + '/'));
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  active
                    ? 'bg-ev-primary/10 text-ev-primary border border-ev-primary/20'
                    : 'text-ev-muted hover:text-ev-text hover:bg-ev-surface2'
                }`}
              >
                <Icon size={17} />
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-ev-border">
          <button
            type="button"
            onClick={() => {
              clearAuth();
              router.push('/admin/login');
            }}
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-ev-muted hover:text-ev-error hover:bg-ev-error/5 text-sm transition-colors"
          >
            <LogOut size={16} />
            Sign out
          </button>
        </div>
      </aside>
      <div className="flex-1 ml-60 sm:ml-64 min-h-screen">{children}</div>
    </div>
  );
}
