'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  FileText,
  Settings,
  LogOut,
  Loader2,
  Boxes,
  TrendingUp,
} from 'lucide-react';
import { EvisionLogo } from '@/components/brand/EvisionLogo';
import { adminApi } from '@/lib/api';
import { clearAuth, getRole } from '@/lib/auth';
import { orderNeedsShipment } from '@/lib/admin-orders';
import { ResponsiveSidebarShell } from '@/components/layout/ResponsiveSidebarShell';

type AdminMe = {
  shop_name?: string;
  owner_name?: string;
  status?: string;
};

const navItems: Array<{
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  badge?: 'ordersAttention';
}> = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/products', label: 'Products', icon: Package },
  { href: '/admin/orders', label: 'Orders', icon: ShoppingCart, badge: 'ordersAttention' },
  { href: '/admin/inventory', label: 'Inventory', icon: Boxes },
  { href: '/admin/invoices', label: 'Invoices', icon: FileText },
  { href: '/admin/revenue', label: 'Revenue', icon: TrendingUp },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [admin, setAdmin] = useState<AdminMe | null>(null);
  const [loading, setLoading] = useState(true);
  const [ordersAttention, setOrdersAttention] = useState<number | null>(null);

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
    if (admin?.status !== 'approved') {
      setOrdersAttention(null);
      return;
    }
    let cancelled = false;
    adminApi
      .getOrders()
      .then((r) => {
        if (cancelled) return;
        const rows = Array.isArray(r.data) ? (r.data as { status?: string }[]) : [];
        setOrdersAttention(rows.filter((o) => orderNeedsShipment(o.status)).length);
      })
      .catch(() => {
        if (!cancelled) setOrdersAttention(null);
      });
    return () => {
      cancelled = true;
    };
  }, [admin?.status]);

  if (loading) {
    return (
      <div className="min-h-screen bg-ev-bg flex items-center justify-center text-ev-muted gap-2">
        <Loader2 className="animate-spin text-ev-primary" size={24} />
        Loading…
      </div>
    );
  }

  const shopTitle = admin?.shop_name?.trim() || 'E vision';

  const sidebar = (
    <>
      <div className="p-5 border-b ev-sidebar-border shrink-0">
        <Link href="/admin/dashboard" className="flex items-center gap-2.5">
          <EvisionLogo variant="mark" height={36} className="shrink-0 shadow-ev-glow rounded-lg" />
          <div className="min-w-0">
            <p className="text-white font-bold text-sm truncate">{shopTitle}</p>
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
      <nav className="p-3 space-y-0.5">
        {navItems.map(({ href, label, icon: Icon, badge }) => {
          const active =
            pathname === href || (href !== '/admin/dashboard' && pathname.startsWith(href + '/'));
          const showBadge =
            badge === 'ordersAttention' &&
            ordersAttention != null &&
            ordersAttention > 0 &&
            admin?.status === 'approved';
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
              {showBadge ? (
                <span className="shrink-0 min-w-[1.25rem] h-5 px-1 flex items-center justify-center rounded-full bg-ev-primary text-white text-[10px] font-bold">
                  {ordersAttention > 99 ? '99+' : ordersAttention}
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
            router.push('/admin/login');
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
    <ResponsiveSidebarShell mobileTopBarTitle={shopTitle} sidebar={sidebar}>
      {children}
    </ResponsiveSidebarShell>
  );
}
