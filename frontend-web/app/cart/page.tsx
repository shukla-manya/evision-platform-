'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Loader2, Minus, Plus, ShoppingCart, Trash2, Wallet } from 'lucide-react';
import toast from 'react-hot-toast';
import { cartApi } from '@/lib/api';
import { getRole } from '@/lib/auth';
import { PublicShell } from '@/components/public/PublicShell';

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
  const [coupon, setCoupon] = useState('');
  const [updating, setUpdating] = useState<string | null>(null);

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
    void loadCart();
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

  async function setQty(itemId: string, next: number) {
    if (next < 1) return;
    setUpdating(itemId);
    try {
      await cartApi.updateItemQuantity(itemId, next);
      await loadCart();
    } catch {
      toast.error('Could not update quantity');
    } finally {
      setUpdating(null);
    }
  }

  function applyCoupon() {
    const c = coupon.trim().toUpperCase();
    if (!c) {
      toast.error('Enter a coupon code');
      return;
    }
    toast('Promo codes will apply at checkout soon.', { icon: 'ℹ️' });
  }

  return (
    <PublicShell>
      <main className="ev-container py-8 space-y-6 w-full min-w-0">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-ev-text">My cart</h1>
            <p className="text-ev-muted text-sm mt-1">Items grouped by shop — checkout in one payment.</p>
          </div>
          <Link href="/shop" className="ev-btn-secondary text-sm py-2 px-4 self-start sm:self-auto">
            Continue shopping
          </Link>
        </div>
        {loading ? (
          <div className="flex items-center gap-2 text-ev-muted py-20 justify-center">
            <Loader2 className="animate-spin text-ev-primary" size={24} />
            Loading cart…
          </div>
        ) : cart.shops.length === 0 ? (
          <div className="ev-card p-16 text-center text-ev-muted">
            <ShoppingCart className="mx-auto mb-3 opacity-30" size={40} />
            <p className="text-ev-text font-medium mb-1">Your cart is empty.</p>
            <Link href="/shop" className="ev-btn-primary inline-flex mt-4">
              Discover products
            </Link>
          </div>
        ) : (
          <div className="grid lg:grid-cols-[1fr_320px] gap-6">
            <section className="space-y-4">
              {cart.shops.map((shop) => (
                <article key={shop.admin_id} className="ev-card p-5">
                  <div className="flex items-center justify-between mb-4 gap-3">
                    <div>
                      <h2 className="text-ev-text font-semibold">
                        {shop.shop_name}{' '}
                        <span className="text-ev-muted font-normal text-sm">
                          ({shop.items.length} {shop.items.length === 1 ? 'item' : 'items'})
                        </span>
                      </h2>
                    </div>
                    <p className="text-ev-primary font-semibold text-sm shrink-0">
                      Subtotal {formatInr(Number(shop.shop_total || 0))}
                    </p>
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
                          <p className="text-ev-muted text-xs">{formatInr(Number(item.price_at_time || 0))} each</p>
                          <div className="flex items-center gap-2 mt-2">
                            <button
                              type="button"
                              aria-label="Decrease quantity"
                              disabled={updating === item.id || item.quantity <= 1}
                              className="w-8 h-8 rounded-lg border border-ev-border flex items-center justify-center hover:bg-ev-surface2 disabled:opacity-40"
                              onClick={() => void setQty(item.id, item.quantity - 1)}
                            >
                              <Minus size={14} />
                            </button>
                            <span className="text-sm font-semibold text-ev-text w-6 text-center">{item.quantity}</span>
                            <button
                              type="button"
                              aria-label="Increase quantity"
                              disabled={updating === item.id}
                              className="w-8 h-8 rounded-lg border border-ev-border flex items-center justify-center hover:bg-ev-surface2 disabled:opacity-40"
                              onClick={() => void setQty(item.id, item.quantity + 1)}
                            >
                              <Plus size={14} />
                            </button>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
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

            <aside className="ev-card p-5 h-fit sticky top-24 space-y-4">
              <h3 className="text-ev-text font-semibold">Price summary</h3>
              {cart.shops.map((shop) => (
                <div key={shop.admin_id} className="flex justify-between text-sm text-ev-muted">
                  <span className="truncate pr-2">{shop.shop_name}</span>
                  <span className="text-ev-text font-medium shrink-0">{formatInr(Number(shop.shop_total || 0))}</span>
                </div>
              ))}
              <div>
                <label className="ev-label text-xs">Coupon code</label>
                <div className="flex gap-2 mt-1">
                  <input
                    className="ev-input py-2 text-sm flex-1"
                    placeholder="Enter code"
                    value={coupon}
                    onChange={(e) => setCoupon(e.target.value)}
                  />
                  <button type="button" className="ev-btn-secondary text-sm px-3 py-2 shrink-0" onClick={applyCoupon}>
                    Apply
                  </button>
                </div>
              </div>
              <div className="border-t border-ev-border pt-3 flex items-center justify-between">
                <span className="text-ev-text font-medium">Grand total</span>
                <span className="text-ev-text font-bold text-lg">{formatInr(Number(cart.grand_total || 0))}</span>
              </div>
              <Link
                href="/checkout"
                className="ev-btn-primary w-full py-2.5 inline-flex items-center justify-center gap-2"
              >
                <Wallet size={16} />
                Proceed to checkout
              </Link>
            </aside>
          </div>
        )}
      </main>
    </PublicShell>
  );
}
