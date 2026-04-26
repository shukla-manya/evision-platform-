'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Bell, Loader2, LogOut, MapPin, User } from 'lucide-react';
import toast from 'react-hot-toast';
import { authApi } from '@/lib/api';
import { clearAuth, getRole } from '@/lib/auth';
import { PublicShell } from '@/components/public/PublicShell';

type User = {
  name?: string;
  email?: string;
  phone?: string;
  gst_no?: string | null;
  business_name?: string | null;
  business_address?: string | null;
  address_book?: Array<{
    label?: string;
    address?: string;
    city?: string;
    state?: string;
    pincode?: string;
    is_default?: boolean;
  }>;
};

export default function ProfilePage() {
  const role = typeof window !== 'undefined' ? getRole() : undefined;
  const ok = role === 'customer' || role === 'dealer';

  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [emailOrders, setEmailOrders] = useState(true);
  const [pushOffers, setPushOffers] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await authApi.me();
      setUser((data as { user?: User })?.user || null);
    } catch {
      toast.error('Could not load profile');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!ok) return;
    void load();
  }, [ok, load]);

  useEffect(() => {
    try {
      const a = localStorage.getItem('ev_notif_email_orders');
      const b = localStorage.getItem('ev_notif_push_offers');
      if (a != null) setEmailOrders(a === '1');
      if (b != null) setPushOffers(b === '1');
    } catch {
      /* ignore */
    }
  }, []);

  function persistNotif(key: string, val: boolean) {
    try {
      localStorage.setItem(key, val ? '1' : '0');
    } catch {
      /* ignore */
    }
  }

  if (!ok) {
    return (
      <PublicShell>
        <main className="max-w-md mx-auto px-4 py-16 text-center text-ev-muted">
          <Link href="/login" className="ev-btn-primary">
            Sign in
          </Link>
        </main>
      </PublicShell>
    );
  }

  return (
    <PublicShell>
      <main className="max-w-xl mx-auto px-4 sm:px-6 py-10 space-y-6">
        <h1 className="text-2xl font-bold text-ev-text">Profile</h1>

        {loading ? (
          <div className="flex justify-center py-12 text-ev-muted gap-2">
            <Loader2 className="animate-spin text-ev-primary" size={22} /> Loading…
          </div>
        ) : (
          <>
            <section className="ev-card p-6 space-y-3">
              <h2 className="text-sm font-semibold text-ev-text flex items-center gap-2">
                <User size={16} className="text-ev-primary" />
                My details
              </h2>
              <p className="text-sm text-ev-muted">
                <span className="text-ev-subtle">Name</span>
                <br />
                <span className="text-ev-text">{user?.name || '—'}</span>
              </p>
              <p className="text-sm text-ev-muted">
                <span className="text-ev-subtle">Email</span>
                <br />
                <span className="text-ev-text">{user?.email || '—'}</span>
              </p>
              <p className="text-sm text-ev-muted">
                <span className="text-ev-subtle">Phone</span>
                <br />
                <span className="text-ev-text">{user?.phone || '—'}</span>
              </p>
            </section>

            {role === 'dealer' ? (
              <section className="ev-card p-6 space-y-3">
                <h2 className="text-sm font-semibold text-ev-text">Dealer account</h2>
                <p className="text-ev-muted text-sm">
                  Same cart, checkout, orders, and technician booking as customers — with dealer pricing in the shop and
                  GST tax invoices from Dealer hub.
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  <Link href="/dealer/dashboard" className="ev-btn-primary text-sm py-2 px-4">
                    Dealer hub
                  </Link>
                  <Link href="/dealer/invoices" className="ev-btn-secondary text-sm py-2 px-4">
                    GST invoices
                  </Link>
                </div>
                {user?.gst_no ? (
                  <p className="text-sm text-ev-muted pt-2 border-t border-ev-border">
                    <span className="text-ev-subtle">GSTIN</span>
                    <br />
                    <span className="text-ev-text font-mono">{user.gst_no}</span>
                  </p>
                ) : null}
                {user?.business_name ? (
                  <p className="text-sm text-ev-muted">
                    <span className="text-ev-subtle">Business</span>
                    <br />
                    <span className="text-ev-text">{user.business_name}</span>
                  </p>
                ) : null}
                {user?.business_address ? (
                  <p className="text-sm text-ev-muted">
                    <span className="text-ev-subtle">Business address</span>
                    <br />
                    <span className="text-ev-text">{user.business_address}</span>
                  </p>
                ) : null}
              </section>
            ) : null}

            <section className="ev-card p-6 space-y-3">
              <h2 className="text-sm font-semibold text-ev-text flex items-center gap-2">
                <MapPin size={16} className="text-ev-primary" />
                Saved addresses
              </h2>
              {(user?.address_book || []).length === 0 ? (
                <p className="text-ev-muted text-sm">No addresses yet. Add one at checkout.</p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {user!.address_book!.map((a, i) => (
                    <li key={i} className="rounded-xl border border-ev-border p-3 text-ev-muted">
                      <span className="font-medium text-ev-text">{a.label || 'Address'}</span>
                      {a.is_default ? (
                        <span className="ml-2 text-xs text-ev-primary">Default</span>
                      ) : null}
                      <p className="mt-1">
                        {a.address}, {a.city}, {a.state} {a.pincode}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
              <Link href="/checkout" className="ev-btn-secondary text-sm py-2 px-4 inline-flex mt-1">
                Manage at checkout
              </Link>
            </section>

            <section className="ev-card p-6 space-y-4">
              <h2 className="text-sm font-semibold text-ev-text flex items-center gap-2">
                <Bell size={16} className="text-ev-primary" />
                Notifications
              </h2>
              <label className="flex items-center justify-between gap-4 text-sm text-ev-text cursor-pointer">
                <span>Order updates by email</span>
                <input
                  type="checkbox"
                  checked={emailOrders}
                  onChange={(e) => {
                    setEmailOrders(e.target.checked);
                    persistNotif('ev_notif_email_orders', e.target.checked);
                    toast.success('Preference saved on this device');
                  }}
                  className="rounded border-ev-border"
                />
              </label>
              <label className="flex items-center justify-between gap-4 text-sm text-ev-text cursor-pointer">
                <span>Deals &amp; offers (push)</span>
                <input
                  type="checkbox"
                  checked={pushOffers}
                  onChange={(e) => {
                    setPushOffers(e.target.checked);
                    persistNotif('ev_notif_push_offers', e.target.checked);
                    toast.success('Preference saved on this device');
                  }}
                  className="rounded border-ev-border"
                />
              </label>
              <p className="text-ev-subtle text-xs">Device-only toggles; connect FCM in the mobile app for real pushes.</p>
            </section>

            <button
              type="button"
              className="ev-card p-5 w-full flex items-center justify-center gap-2 text-ev-error border-ev-error/20 hover:bg-ev-error/5 transition-colors"
              onClick={() => {
                clearAuth();
                window.location.href = '/';
              }}
            >
              <LogOut size={18} />
              Sign out
            </button>
          </>
        )}
      </main>
    </PublicShell>
  );
}
