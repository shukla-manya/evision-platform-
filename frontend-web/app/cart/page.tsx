'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, ShoppingCart, Trash2, Wallet } from 'lucide-react';
import toast from 'react-hot-toast';
import { cartApi } from '@/lib/api';
import { getRole } from '@/lib/auth';

type CartItem = {
  id: string;
  product_id: string;
  product_name?: string;
  product_image_url?: string | null;
  quantity: number;
  price_at_time: number;
  line_total: number;
};

type CartShop = {
  admin_id: string;
  shop_name: string;
  shop_total: number;
  items: CartItem[];
};

type CartResponse = {
  shops: CartShop[];
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

export default function CartPage() {
  const router = useRouter();
  const role = typeof window !== 'undefined' ? getRole() : undefined;
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<CartResponse>({
    shops: [],
    total_items: 0,
    grand_total: 0,
    currency: 'INR',
  });

  const canUseCart = useMemo(() => role === 'customer' || role === 'dealer', [role]);

  const loadCart = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await cartApi.getCart();
      setCart(data as CartResponse);
    } catch {
      toast.error('Failed to load cart');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!canUseCart) {
      toast.error('Sign in as customer or dealer to use cart');
      router.replace('/login');
      return;
    }
    const timer = setTimeout(() => {
      void loadCart();
    }, 0);
    return () => clearTimeout(timer);
  }, [canUseCart, loadCart, router]);

  async function removeItem(itemId: string) {
    try {
      await cartApi.removeItem(itemId);
      toast.success('Removed from cart');
      await loadCart();
    } catch {
      toast.error('Could not remove item');
    }
  }

  return (
    <div className="min-h-screen bg-ev-bg">
      <header className="ev-header">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-white font-bold text-base sm:text-lg">Your cart</h1>
            <p className="text-white/50 text-xs truncate">Items grouped by shop (multi-shop cart)</p>
          </div>
          <Link href="/shop" className="ev-btn-secondary text-sm py-2 px-3 inline-flex items-center gap-1.5">
            <ArrowLeft size={14} />
            Continue shopping
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 grid lg:grid-cols-[1fr_320px] gap-6">
        {loading ? (
          <div className="lg:col-span-2 flex items-center gap-2 text-ev-muted py-20 justify-center">
            <Loader2 className="animate-spin text-ev-primary" size={24} />
            Loading cart...
          </div>
        ) : cart.shops.length === 0 ? (
          <div className="lg:col-span-2 ev-card p-16 text-center text-ev-muted">
            <ShoppingCart className="mx-auto mb-3 opacity-30" size={40} />
            <p className="text-ev-text font-medium mb-1">Your cart is empty</p>
            <p className="text-sm">Add products from one or multiple shops to checkout.</p>
          </div>
        ) : (
          <>
            <section className="space-y-4">
              {cart.shops.map((shop) => (
                <article key={shop.admin_id} className="ev-card p-5">
                  <div className="flex items-center justify-between mb-4 gap-3">
                    <div>
                      <h2 className="text-ev-text font-semibold">{shop.shop_name}</h2>
                      <p className="text-ev-muted text-xs font-mono">{shop.admin_id}</p>
                    </div>
                    <p className="text-ev-primary font-semibold">{formatInr(Number(shop.shop_total || 0))}</p>
                  </div>
                  <div className="space-y-3">
                    {shop.items.map((item) => (
                      <div key={item.id} className="border border-ev-border rounded-xl p-3 flex items-center gap-3">
                        <div className="w-14 h-14 rounded-lg border border-ev-border bg-ev-surface2 overflow-hidden shrink-0">
                          {item.product_image_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={item.product_image_url} alt="" className="w-full h-full object-cover" />
                          ) : null}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-ev-text font-medium text-sm truncate">{item.product_name || 'Product'}</p>
                          <p className="text-ev-muted text-xs">
                            {item.quantity} x {formatInr(Number(item.price_at_time || 0))}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-ev-text font-semibold text-sm">{formatInr(Number(item.line_total || 0))}</p>
                          <button
                            type="button"
                            onClick={() => void removeItem(item.id)}
                            className="text-ev-error text-xs mt-1 inline-flex items-center gap-1 hover:underline"
                          >
                            <Trash2 size={12} />
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </article>
              ))}
            </section>

            <aside className="ev-card p-5 h-fit sticky top-24">
              <h3 className="text-ev-text font-semibold mb-4">Order summary</h3>
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
              <Link
                href="/checkout"
                className="ev-btn-primary w-full mt-5 py-2.5 inline-flex items-center justify-center gap-2"
              >
                <Wallet size={16} />
                Proceed to checkout
              </Link>
              <p className="text-ev-subtle text-xs mt-2">Review and pay on the checkout page.</p>
            </aside>
          </>
        )}
      </main>
    </div>
  );
}
