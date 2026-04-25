'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Script from 'next/script';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, Wallet, CheckCircle2, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { cartApi, checkoutApi } from '@/lib/api';
import { getRole } from '@/lib/auth';

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => {
      open: () => void;
      on: (event: string, handler: (response: unknown) => void) => void;
    };
  }
}

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
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [cart, setCart] = useState<CartResponse>({
    shops: [],
    total_items: 0,
    grand_total: 0,
    currency: 'INR',
  });

  const loadCart = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await cartApi.getCart();
      setCart(data as CartResponse);
    } catch {
      toast.error('Failed to load checkout details');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!canUseCart) {
      router.replace('/login');
      return;
    }
    const timer = setTimeout(() => {
      void loadCart();
    }, 0);
    return () => clearTimeout(timer);
  }, [canUseCart, loadCart, router]);

  async function payNow() {
    if (!window.Razorpay) {
      toast.error('Payment SDK not loaded');
      return;
    }
    setPaying(true);
    try {
      const { data } = await checkoutApi.createOrder();
      const d = data as {
        razorpay_order_id: string;
        amount_paise: number;
        currency: string;
        key_id?: string;
      };
      if (!d.razorpay_order_id || !d.key_id) {
        toast.error('Checkout response is incomplete');
        return;
      }

      const rp = new window.Razorpay({
        key: d.key_id,
        amount: d.amount_paise,
        currency: d.currency || 'INR',
        order_id: d.razorpay_order_id,
        name: 'E Vision',
        description: 'Order payment',
        handler: () => {
          toast.success('Payment submitted. Confirming order...');
          router.push('/orders');
        },
        modal: {
          ondismiss: () => toast('Payment window closed'),
        },
        theme: { color: '#4F46E5' },
      });
      rp.on('payment.failed', () => toast.error('Payment failed'));
      rp.open();
    } catch {
      toast.error('Could not start payment');
    } finally {
      setPaying(false);
    }
  }

  return (
    <div className="min-h-screen bg-ev-bg">
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="afterInteractive" />
      <header className="border-b border-ev-border bg-ev-surface/90 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-ev-text font-bold text-base sm:text-lg">Checkout</h1>
            <p className="text-ev-subtle text-xs">Single payment, auto-split by shop after success</p>
          </div>
          <Link href="/cart" className="ev-btn-secondary text-sm py-2 px-3 inline-flex items-center gap-1.5">
            <ArrowLeft size={14} />
            Back to cart
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {loading ? (
          <div className="flex items-center gap-2 text-ev-muted py-20 justify-center">
            <Loader2 className="animate-spin text-ev-primary" size={24} />
            Loading...
          </div>
        ) : cart.shops.length === 0 ? (
          <div className="ev-card p-16 text-center text-ev-muted">
            <AlertCircle className="mx-auto mb-3 opacity-40" size={36} />
            <p className="text-ev-text font-medium mb-1">Your cart is empty</p>
            <p className="text-sm mb-4">Add products first, then return to checkout.</p>
            <Link href="/shop" className="ev-btn-primary py-2.5 px-4 text-sm inline-flex items-center gap-2">
              Continue shopping
            </Link>
          </div>
        ) : (
          <div className="grid lg:grid-cols-[1fr_320px] gap-6">
            <section className="ev-card p-5">
              <h2 className="text-ev-text font-semibold mb-4">Review items</h2>
              <div className="space-y-4">
                {cart.shops.map((shop) => (
                  <div key={shop.admin_id} className="rounded-xl border border-ev-border p-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-ev-text font-medium">{shop.shop_name}</p>
                      <p className="text-ev-primary text-sm font-semibold">{formatInr(Number(shop.shop_total || 0))}</p>
                    </div>
                    <div className="space-y-1.5">
                      {shop.items.map((it) => (
                        <div key={it.id} className="flex items-center justify-between text-sm">
                          <span className="text-ev-muted truncate">
                            {it.product_name || 'Product'} x {it.quantity}
                          </span>
                          <span className="text-ev-text">{formatInr(Number(it.line_total || 0))}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <aside className="ev-card p-5 h-fit sticky top-24">
              <h3 className="text-ev-text font-semibold mb-4">Payment</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between text-ev-muted">
                  <span>Total items</span>
                  <span className="text-ev-text">{cart.total_items}</span>
                </div>
                <div className="flex items-center justify-between text-ev-muted">
                  <span>Currency</span>
                  <span className="text-ev-text">{cart.currency || 'INR'}</span>
                </div>
                <div className="border-t border-ev-border pt-2 mt-2 flex items-center justify-between">
                  <span className="text-ev-text font-medium">Grand total</span>
                  <span className="text-ev-text font-bold text-lg">{formatInr(Number(cart.grand_total || 0))}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => void payNow()}
                disabled={paying}
                className="ev-btn-primary w-full mt-5 py-2.5 inline-flex items-center justify-center gap-2"
              >
                {paying ? <Loader2 size={16} className="animate-spin" /> : <Wallet size={16} />}
                {paying ? 'Starting payment...' : 'Pay with Razorpay'}
              </button>
              <div className="mt-3 text-xs text-ev-subtle flex items-start gap-2">
                <CheckCircle2 size={13} className="text-ev-success mt-0.5 shrink-0" />
                Your payment confirmation and order split happens via secure webhook.
              </div>
            </aside>
          </div>
        )}
      </main>
    </div>
  );
}
