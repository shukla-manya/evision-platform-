'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Package, ShoppingCart, FileText, Clock, CheckCircle, BarChart3 } from 'lucide-react';
import toast from 'react-hot-toast';
import { adminApi } from '@/lib/api';
import { AdminShell } from '@/components/admin/AdminShell';

type AdminMe = {
  shop_name?: string;
  owner_name?: string;
  status?: string;
};

export default function AdminDashboardPage() {
  const [admin, setAdmin] = useState<AdminMe | null>(null);
  const [productCount, setProductCount] = useState<number | null>(null);
  const [orderCount, setOrderCount] = useState<number | null>(null);
  const [invoiceCount, setInvoiceCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      adminApi.getMe().then((r) => setAdmin(r.data as AdminMe)),
      adminApi
        .getProducts()
        .then((r) => setProductCount(Array.isArray(r.data) ? r.data.length : 0))
        .catch(() => setProductCount(null)),
      adminApi
        .getOrders()
        .then((r) => setOrderCount(Array.isArray(r.data) ? r.data.length : 0))
        .catch(() => setOrderCount(null)),
      adminApi
        .getInvoices()
        .then((r) => setInvoiceCount(Array.isArray(r.data) ? r.data.length : 0))
        .catch(() => setInvoiceCount(null)),
    ])
      .catch(() => toast.error('Failed to load dashboard'))
      .finally(() => setLoading(false));
  }, []);

  if (loading || !admin) {
    return (
      <AdminShell>
        <main className="p-10 text-ev-muted text-sm">Loading dashboard…</main>
      </AdminShell>
    );
  }

  if (admin.status === 'pending') {
    return (
      <AdminShell>
        <main className="p-6 sm:p-10 flex items-center justify-center min-h-[60vh]">
          <div className="max-w-md w-full ev-card p-10 text-center">
            <div className="w-16 h-16 bg-ev-warning/10 border-2 border-ev-warning rounded-full flex items-center justify-center mx-auto mb-6">
              <Clock size={32} className="text-ev-warning" />
            </div>
            <h2 className="text-xl font-bold text-ev-text mb-3">Awaiting approval</h2>
            <p className="text-ev-muted text-sm leading-relaxed">
              Your shop <strong className="text-ev-text">{admin.shop_name}</strong> is under review. You will be
              notified by email once a superadmin approves your account.
            </p>
          </div>
        </main>
      </AdminShell>
    );
  }

  return (
    <AdminShell>
      <main className="p-6 sm:p-10">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-ev-text">Dashboard</h1>
          <p className="text-ev-muted text-sm mt-0.5">
            {admin?.shop_name ?? 'Your shop'} —{' '}
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          {[
            { label: 'Products', value: productCount ?? '—', icon: Package, href: '/admin/products', color: 'text-ev-primary', bg: 'bg-ev-primary/10' },
            { label: 'Orders', value: orderCount ?? '—', icon: ShoppingCart, href: '/admin/orders', color: 'text-ev-warning', bg: 'bg-ev-warning/10' },
            { label: 'Invoices', value: invoiceCount ?? '—', icon: FileText, href: '/admin/invoices', color: 'text-ev-accent', bg: 'bg-ev-accent/10' },
            { label: 'Status', value: admin.status === 'approved' ? 'Live' : '—', icon: CheckCircle, href: '/admin/settings', color: 'text-ev-success', bg: 'bg-ev-success/10' },
          ].map(({ label, value, icon: Icon, href, color, bg }) => (
            <Link key={label} href={href} className="ev-card p-6 hover:border-ev-primary/30 transition-colors block">
              <div className={`w-10 h-10 ${bg} rounded-xl flex items-center justify-center mb-3`}>
                <Icon size={20} className={color} />
              </div>
              <p className="text-2xl font-bold text-ev-text">{value}</p>
              <p className="text-ev-muted text-sm mt-1">{label}</p>
            </Link>
          ))}
        </div>

        <div className="ev-card p-6">
          <h3 className="text-ev-text font-semibold mb-4 flex items-center gap-2">
            <BarChart3 size={18} className="text-ev-primary" />
            Quick actions
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Link href="/admin/products/new" className="ev-btn-secondary flex items-center justify-center gap-2 py-3 text-sm">
              <Package size={16} />
              Add product
            </Link>
            <Link href="/admin/orders" className="ev-btn-secondary flex items-center justify-center gap-2 py-3 text-sm">
              <ShoppingCart size={16} />
              View orders
            </Link>
            <Link href="/admin/invoices" className="ev-btn-secondary flex items-center justify-center gap-2 py-3 text-sm">
              <FileText size={16} />
              Invoices
            </Link>
          </div>
        </div>
      </main>
    </AdminShell>
  );
}
