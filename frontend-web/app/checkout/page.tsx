'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Loader2, MapPin, Wallet, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { authApi, cartApi, checkoutApi } from '@/lib/api';
import { getRole } from '@/lib/auth';
import { PublicShell } from '@/components/public/PublicShell';
import { AddressBookEditor, type AddressBookEntry } from '@/components/account/AddressBookEditor';

type CartResponse = {
  shops: Array<{
    admin_id: string;
    shop_name: string;
    shop_total: number;
    items: Array<{
      id: string;
      product_name?: string;
      quantity: number;
      line_total: number;
    }>;
  }>;
  total_items: number;
  grand_total: number;
  currency: string;
};

function formatInr(n: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(n);
}

export default function CheckoutPage() {
  const router = useRouter();
  const role = typeof window !== 'undefined' ? getRole() : undefined;
  const canUseCart = useMemo(() => role === 'customer' || role === 'dealer', [role]);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [cart, setCart] = useState<CartResponse>({
    shops: [],
    total_items: 0,
    grand_total: 0,
    currency: 'INR',
  });
  const [addresses, setAddresses] = useState<AddressBookEntry[]>([]);
  const [selectedIdx, setSelectedIdx] = useState(0);

  const loadCart = useCallback(async () => {
    setLoading(true);
    try {
      const [{ data: cartData }, meRes] = await Promise.all([
        cartApi.getCart(),
        authApi.me().catch(() => ({ data: {} })),
      ]);
      setCart(cartData as CartResponse);
      const u = (meRes.data as { user?: { address_book?: AddressBookEntry[] } })?.user;
      const book = Array.isArray(u?.address_book) ? u!.address_book! : [];
      setAddresses(book);
      const def = book.findIndex((a) => a.is_default);
      setSelectedIdx(def >= 0 ? def : 0);
    } catch {
      toast.error('Failed to load checkout');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!canUseCart) {
      router.replace('/login');
      return;
    }
    void loadCart();
  }, [canUseCart, loadCart, router]);

  async function payNow() {
    if (!addresses.length) {
      toast.error('Add a delivery address first');
      setStep(1);
      return;
    }
    setPaying(true);
    try {
      const { data } = await checkoutApi.createOrder({ delivery_address_index: selectedIdx });
      const d = data as {
        payment_provider?: string;
        action?: string;
        fields?: Record<string, string>;
      };
      if (d.payment_provider !== 'payu' || !d.action || !d.fields) {
        toast.error('Checkout response is incomplete');
        return;
      }
      const form = document.createElement('form');
      form.method = 'POST';
      form.action = d.action;
      form.style.display = 'none';
      for (const [name, value] of Object.entries(d.fields)) {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = name;
        input.value = value;
        form.appendChild(input);
      }
      document.body.appendChild(form);
      form.submit();
    } catch {
      toast.error('Could not start payment');
      setPaying(false);
    }
  }

  const total = Number(cart.grand_total || 0);

  return (
    <PublicShell>
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-ev-text">Checkout</h1>
            <p className="text-ev-muted text-sm mt-1">Delivery address → Review → Secure payment</p>
          </div>
          <Link href="/cart" className="ev-btn-secondary text-sm py-2 px-4 self-start">
            Back to cart
          </Link>
        </div>

        <div className="flex gap-2 text-sm">
          {[1, 2, 3].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setStep(n)}
              className={`flex-1 py-2 rounded-xl border text-center font-medium transition-colors ${
                step === n ? 'border-ev-primary bg-ev-primary/10 text-ev-primary' : 'border-ev-border text-ev-muted'
              }`}
            >
              Step {n}
              {n === 1 ? ' · Address' : n === 2 ? ' · Review' : ' · Pay'}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-ev-muted py-20 justify-center">
            <Loader2 className="animate-spin text-ev-primary" size={24} />
            Loading…
          </div>
        ) : cart.shops.length === 0 ? (
          <div className="ev-card p-16 text-center text-ev-muted">
            <AlertCircle className="mx-auto mb-3 opacity-40" size={36} />
            <p className="text-ev-text font-medium mb-1">Your cart is empty</p>
            <Link href="/shop" className="ev-btn-primary mt-4 inline-flex">
              Discover products
            </Link>
          </div>
        ) : (
          <>
            {step === 1 ? (
              <section className="ev-card p-6 space-y-4">
                <h2 className="text-lg font-semibold text-ev-text flex items-center gap-2">
                  <MapPin size={18} className="text-ev-primary" />
                  Select delivery address
                </h2>
                {addresses.length === 0 ? (
                  <p className="text-ev-muted text-sm">No saved addresses yet. Add one below.</p>
                ) : (
                  <ul className="space-y-2">
                    {addresses.map((a, i) => (
                      <li key={i}>
                        <label className="flex gap-3 p-4 rounded-xl border border-ev-border cursor-pointer hover:bg-ev-surface2/60 has-[:checked]:border-ev-primary has-[:checked]:bg-ev-primary/5">
                          <input
                            type="radio"
                            name="addr"
                            checked={selectedIdx === i}
                            onChange={() => setSelectedIdx(i)}
                            className="mt-1"
                          />
                          <div className="text-sm">
                            <p className="font-semibold text-ev-text">{a.label || 'Address'}</p>
                            <p className="text-ev-muted mt-1">
                              {a.address}, {a.city}, {a.state} {a.pincode}
                            </p>
                          </div>
                        </label>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="border-t border-ev-border pt-4 space-y-3">
                  <p className="text-sm font-medium text-ev-text">Add new address</p>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <input
                      className="ev-input"
                      placeholder="Label (e.g. Home)"
                      value={newAddr.label}
                      onChange={(e) => setNewAddr((x) => ({ ...x, label: e.target.value }))}
                    />
                    <input
                      className="ev-input"
                      placeholder="Pincode"
                      value={newAddr.pincode}
                      onChange={(e) => setNewAddr((x) => ({ ...x, pincode: e.target.value.replace(/\D/g, '').slice(0, 6) }))}
                    />
                  </div>
                  <input
                    className="ev-input"
                    placeholder="Street address"
                    value={newAddr.address}
                    onChange={(e) => setNewAddr((x) => ({ ...x, address: e.target.value }))}
                  />
                  <div className="grid sm:grid-cols-2 gap-3">
                    <input
                      className="ev-input"
                      placeholder="City"
                      value={newAddr.city}
                      onChange={(e) => setNewAddr((x) => ({ ...x, city: e.target.value }))}
                    />
                    <input
                      className="ev-input"
                      placeholder="State"
                      value={newAddr.state}
                      onChange={(e) => setNewAddr((x) => ({ ...x, state: e.target.value }))}
                    />
                  </div>
                  <button
                    type="button"
                    disabled={savingAddr}
                    onClick={() => void saveNewAddress()}
                    className="ev-btn-secondary text-sm py-2 px-4"
                  >
                    {savingAddr ? <Loader2 size={14} className="animate-spin inline" /> : null}
                    Save address
                  </button>
                </div>
                <button type="button" className="ev-btn-primary w-full py-2.5" onClick={() => setStep(2)}>
                  Continue to review
                </button>
              </section>
            ) : null}

            {step === 2 ? (
              <section className="ev-card p-6 space-y-4">
                <h2 className="text-lg font-semibold text-ev-text">Order review</h2>
                <p className="text-ev-muted text-sm">Per-shop items and totals. Coupon codes can be entered from the cart page.</p>
                <div className="space-y-3">
                  {cart.shops.map((shop) => (
                    <div key={shop.admin_id} className="rounded-xl border border-ev-border p-4">
                      <div className="flex justify-between mb-2">
                        <span className="font-medium text-ev-text">{shop.shop_name}</span>
                        <span className="text-ev-primary font-semibold text-sm">{formatInr(Number(shop.shop_total || 0))}</span>
                      </div>
                      {shop.items.map((it) => (
                        <div key={it.id} className="flex justify-between text-sm text-ev-muted">
                          <span className="truncate pr-2">
                            {it.product_name || 'Product'} × {it.quantity}
                          </span>
                          <span className="text-ev-text shrink-0">{formatInr(Number(it.line_total || 0))}</span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
                <div className="flex justify-between text-lg font-bold text-ev-text border-t border-ev-border pt-4">
                  <span>Grand total</span>
                  <span>{formatInr(total)}</span>
                </div>
                <div className="flex gap-3">
                  <button type="button" className="ev-btn-secondary flex-1 py-2.5" onClick={() => setStep(1)}>
                    Back
                  </button>
                  <button type="button" className="ev-btn-primary flex-1 py-2.5" onClick={() => setStep(3)}>
                    Continue to payment
                  </button>
                </div>
              </section>
            ) : null}

            {step === 3 ? (
              <section className="ev-card p-6 space-y-4">
                <h2 className="text-lg font-semibold text-ev-text">Pay securely</h2>
                <p className="text-ev-muted text-sm leading-relaxed">
                  Pay {formatInr(total)} via PayU (UPI, card, netbanking). You will leave this site to complete payment;
                  your order is created after PayU returns successfully.
                </p>
                <div className="rounded-xl bg-ev-surface2 border border-ev-border p-4 text-sm text-ev-muted flex gap-2">
                  <CheckCircle2 size={16} className="text-ev-success shrink-0 mt-0.5" />
                  Delivering to:{' '}
                  <span className="text-ev-text">
                    {addresses[selectedIdx]
                      ? `${addresses[selectedIdx].address}, ${addresses[selectedIdx].city}`
                      : '—'}
                  </span>
                </div>
                <div className="flex gap-3">
                  <button type="button" className="ev-btn-secondary flex-1 py-2.5" onClick={() => setStep(2)}>
                    Back
                  </button>
                  <button
                    type="button"
                    disabled={paying || !addresses.length}
                    onClick={() => void payNow()}
                    className="ev-btn-primary flex-1 py-2.5 inline-flex items-center justify-center gap-2"
                  >
                    {paying ? <Loader2 size={16} className="animate-spin" /> : <Wallet size={16} />}
                    {paying ? 'Opening…' : `Pay ${formatInr(total)}`}
                  </button>
                </div>
              </section>
            ) : null}
          </>
        )}
      </main>
    </PublicShell>
  );
}
