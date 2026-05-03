'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Bell, Loader2, LogOut, User } from 'lucide-react';
import toast from 'react-hot-toast';
import { authApi } from '@/lib/api';
import { clearAuth, getRole } from '@/lib/auth';
import { PublicShell } from '@/components/public/PublicShell';
import { AddressBookEditor, type AddressBookEntry } from '@/components/account/AddressBookEditor';

type User = {
  name?: string;
  email?: string;
  phone?: string;
  gst_no?: string | null;
  gst_verified?: boolean;
  business_name?: string | null;
  business_address?: string | null;
  address_book?: AddressBookEntry[];
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
        <main className="w-full min-w-0 max-w-md mx-auto px-4 sm:px-6 py-16 text-center text-ev-muted">
          <Link href="/login" className="ev-btn-primary">
            Sign in
          </Link>
        </main>
      </PublicShell>
    );
  }

  return (
    <PublicShell>
      <main className="w-full min-w-0 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 pb-12 space-y-6 sm:space-y-8">
        <h1 className="text-xl font-bold text-ev-text sm:text-2xl lg:text-3xl">Profile</h1>

        {loading ? (
          <div className="flex justify-center py-12 text-ev-muted gap-2">
            <Loader2 className="animate-spin text-ev-primary" size={22} /> Loading…
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-6 lg:gap-8 lg:grid-cols-12 items-start">
              <div className="lg:col-span-5 space-y-6 min-w-0">
                <section className="ev-card p-4 sm:p-6 space-y-3 sm:space-y-4">
                  <h2 className="text-sm font-semibold text-ev-text flex items-center gap-2">
                    <User size={16} className="text-ev-primary shrink-0" />
                    My details
                  </h2>
                  <dl className="grid grid-cols-1 gap-3 sm:gap-4 text-sm">
                    <div className="min-w-0">
                      <dt className="text-ev-subtle text-xs font-medium uppercase tracking-wide">Name</dt>
                      <dd className="text-ev-text mt-0.5 break-words">{user?.name || '—'}</dd>
                    </div>
                    <div className="min-w-0">
                      <dt className="text-ev-subtle text-xs font-medium uppercase tracking-wide">Email</dt>
                      <dd className="text-ev-text mt-0.5 break-all">{user?.email || '—'}</dd>
                    </div>
                    <div className="min-w-0">
                      <dt className="text-ev-subtle text-xs font-medium uppercase tracking-wide">Phone</dt>
                      <dd className="text-ev-text mt-0.5 break-words">{user?.phone || '—'}</dd>
                    </div>
                  </dl>
                </section>

                {role === 'dealer' ? (
                  <section className="ev-card p-4 sm:p-6 space-y-3">
                    <h2 className="text-sm font-semibold text-ev-text">Dealer account</h2>
                    <p className="text-ev-muted text-sm leading-relaxed">
                      Same cart, checkout, orders, and technician booking as customers — with dealer pricing in the shop
                      and GST tax invoices from Dealer hub.
                    </p>
                    <div className="flex flex-col sm:flex-row flex-wrap gap-2 pt-1">
                      <Link href="/dealer/dashboard" className="ev-btn-primary text-sm py-2.5 px-4 text-center sm:inline-flex sm:justify-center">
                        Dealer hub
                      </Link>
                      <Link href="/dealer/invoices" className="ev-btn-secondary text-sm py-2.5 px-4 text-center sm:inline-flex sm:justify-center">
                        GST invoices
                      </Link>
                    </div>
                    <p className="text-sm text-ev-muted pt-2 border-t border-ev-border min-w-0">
                      <span className="text-ev-subtle">GST status</span>
                      <br />
                      {user?.gst_verified ? (
                        <span className="text-ev-success font-medium">Verified — wholesale pricing active</span>
                      ) : (
                        <span className="text-amber-800 dark:text-amber-200/90 font-medium">
                          Pending — team is verifying your GSTIN; retail prices until then
                        </span>
                      )}
                    </p>
                    {user?.gst_no ? (
                      <p className="text-sm text-ev-muted pt-2 min-w-0">
                        <span className="text-ev-subtle">GSTIN</span>
                        <br />
                        <span className="text-ev-text font-mono break-all">{user.gst_no}</span>
                      </p>
                    ) : null}
                    {user?.business_name ? (
                      <p className="text-sm text-ev-muted min-w-0">
                        <span className="text-ev-subtle">Business</span>
                        <br />
                        <span className="text-ev-text break-words">{user.business_name}</span>
                      </p>
                    ) : null}
                    {user?.business_address ? (
                      <p className="text-sm text-ev-muted min-w-0">
                        <span className="text-ev-subtle">Business address</span>
                        <br />
                        <span className="text-ev-text break-words">{user.business_address}</span>
                      </p>
                    ) : null}
                  </section>
                ) : null}
              </div>

              <section className="lg:col-span-7 ev-card p-4 sm:p-6 space-y-4 min-w-0">
                <AddressBookEditor
                  variant="profile"
                  addresses={user?.address_book || []}
                  onSaved={(book) => setUser((u) => (u ? { ...u, address_book: book } : u))}
                />
              </section>
            </div>

            <section className="ev-card p-4 sm:p-6 space-y-4 max-w-3xl lg:max-w-none">
              <h2 className="text-sm font-semibold text-ev-text flex items-center gap-2">
                <Bell size={16} className="text-ev-primary shrink-0" />
                Notifications
              </h2>
              <label className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4 text-sm text-ev-text cursor-pointer py-1 min-w-0">
                <span className="min-w-0">Order updates by email</span>
                <input
                  type="checkbox"
                  checked={emailOrders}
                  onChange={(e) => {
                    setEmailOrders(e.target.checked);
                    persistNotif('ev_notif_email_orders', e.target.checked);
                    toast.success('Preference saved on this device');
                  }}
                  className="rounded border-ev-border shrink-0 sm:order-none self-start sm:self-center"
                />
              </label>
              <label className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4 text-sm text-ev-text cursor-pointer py-1 min-w-0">
                <span className="min-w-0">Offers &amp; promotions (push)</span>
                <input
                  type="checkbox"
                  checked={pushOffers}
                  onChange={(e) => {
                    setPushOffers(e.target.checked);
                    persistNotif('ev_notif_push_offers', e.target.checked);
                    toast.success('Preference saved on this device');
                  }}
                  className="rounded border-ev-border shrink-0 self-start sm:self-center"
                />
              </label>
              <p className="text-ev-subtle text-xs">Device-only toggles; connect FCM in the mobile app for real pushes.</p>
            </section>

            <button
              type="button"
              className="ev-card p-4 sm:p-5 w-full max-w-3xl lg:max-w-none flex items-center justify-center gap-2 text-ev-error border-ev-error/20 hover:bg-ev-error/5 transition-colors min-h-12"
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
