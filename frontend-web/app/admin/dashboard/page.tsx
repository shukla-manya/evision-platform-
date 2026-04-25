'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Zap, Package, ShoppingCart, BarChart3, Settings, LogOut, Clock, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { adminApi } from '@/lib/api';
import { clearAuth, getRole } from '@/lib/auth';

type AdminMe = {
  shop_name?: string;
  owner_name?: string;
  status?: string;
};

export default function AdminDashboard() {
  const router = useRouter();
  const [admin, setAdmin] = useState<AdminMe | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (getRole() !== 'admin') {
      router.push('/login');
      return;
    }
    adminApi
      .getMe()
      .then((r) => setAdmin(r.data as AdminMe))
      .catch(() => toast.error('Failed to load profile'))
      .finally(() => setLoading(false));
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-ev-bg flex items-center justify-center">
        <div className="flex items-center gap-3 text-ev-muted">
          <div className="w-6 h-6 border-2 border-ev-primary border-t-transparent rounded-full animate-spin" />
          Loading...
        </div>
      </div>
    );
  }

  if (admin?.status === 'pending') {
    return (
      <div className="min-h-screen bg-ev-bg flex items-center justify-center px-4">
        <div className="max-w-md w-full ev-card p-10 text-center">
          <div className="w-16 h-16 bg-ev-warning/10 border-2 border-ev-warning rounded-full flex items-center justify-center mx-auto mb-6">
            <Clock size={32} className="text-ev-warning" />
          </div>
          <h2 className="text-xl font-bold text-ev-text mb-3">Awaiting Approval</h2>
          <p className="text-ev-muted text-sm leading-relaxed">
            Your shop registration for <strong className="text-ev-text">{admin.shop_name}</strong> is under review.
            You will receive an email once the superadmin approves your account.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ev-bg flex">
      {/* Sidebar */}
      <aside className="w-64 bg-ev-surface border-r border-ev-border flex flex-col fixed h-full">
        <div className="p-6 border-b border-ev-border">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-9 h-9 bg-gradient-primary rounded-lg flex items-center justify-center shadow-ev-glow">
              <Zap size={18} className="text-white" />
            </div>
            <div>
              <p className="text-ev-text font-bold text-sm leading-tight">E Vision</p>
              <p className="text-ev-subtle text-xs">Admin Panel</p>
            </div>
          </div>
          {admin && (
            <div className="bg-ev-surface2 rounded-xl p-3">
              <p className="text-ev-text text-sm font-semibold truncate">{admin.shop_name}</p>
              <p className="text-ev-muted text-xs truncate">{admin.owner_name}</p>
              <span className={`ev-badge mt-1.5 ${admin.status === 'approved' ? 'bg-ev-success/10 text-ev-success border border-ev-success/20' : 'bg-ev-warning/10 text-ev-warning border border-ev-warning/20'}`}>
                {admin.status}
              </span>
            </div>
          )}
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {[
            { href: '/admin/dashboard', icon: BarChart3, label: 'Dashboard', active: true },
            { href: '/admin/products', icon: Package, label: 'Products' },
            { href: '/admin/orders', icon: ShoppingCart, label: 'Orders' },
            { href: '/admin/settings', icon: Settings, label: 'Settings' },
          ].map(({ href, icon: Icon, label, active }) => (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                active
                  ? 'bg-ev-primary/10 text-ev-primary border border-ev-primary/20'
                  : 'text-ev-muted hover:text-ev-text hover:bg-ev-surface2'
              }`}
            >
              <Icon size={16} />{label}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-ev-border">
          <button
            onClick={() => { clearAuth(); router.push('/login'); }}
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-ev-muted hover:text-ev-error hover:bg-ev-error/5 text-sm transition-all"
          >
            <LogOut size={16} /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="ml-64 flex-1 p-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-ev-text">Dashboard</h1>
          <p className="text-ev-muted text-sm mt-0.5">{admin?.shop_name} — {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Products', value: '—', icon: Package, color: 'text-ev-primary', bg: 'bg-ev-primary/10' },
            { label: 'Pending Orders', value: '—', icon: Clock, color: 'text-ev-warning', bg: 'bg-ev-warning/10' },
            { label: 'Delivered', value: '—', icon: CheckCircle, color: 'text-ev-success', bg: 'bg-ev-success/10' },
            { label: 'Revenue', value: '—', icon: BarChart3, color: 'text-ev-accent', bg: 'bg-ev-accent/10' },
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className="ev-card p-6">
              <div className={`w-10 h-10 ${bg} rounded-xl flex items-center justify-center mb-3`}>
                <Icon size={20} className={color} />
              </div>
              <p className="text-2xl font-bold text-ev-text">{value}</p>
              <p className="text-ev-muted text-sm mt-1">{label}</p>
            </div>
          ))}
        </div>

        {/* Quick actions */}
        <div className="ev-card p-6">
          <h3 className="text-ev-text font-semibold mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              { href: '/admin/products/new', label: 'Add Product', icon: Package },
              { href: '/admin/orders', label: 'View Orders', icon: ShoppingCart },
              { href: '/admin/settings', label: 'Shop Settings', icon: Settings },
            ].map(({ href, label, icon: Icon }) => (
              <Link key={href} href={href} className="ev-btn-secondary flex items-center gap-2 justify-center py-3 text-sm">
                <Icon size={16} /> {label}
              </Link>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
