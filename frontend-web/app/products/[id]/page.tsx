'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Heart, Loader2, Minus, Package, Plus, ShoppingCart, Truck } from 'lucide-react';
import toast from 'react-hot-toast';
import { cartApi, catalogApi } from '@/lib/api';
import { getRole } from '@/lib/auth';
import { PublicShell } from '@/components/public/PublicShell';
import { isInWishlist, toggleWishlistId } from '@/lib/wishlist';

type Product = {
  id: string;
  name: string;
  description?: string;
  price_customer?: number;
  price_dealer?: number;
  images?: string[];
  stock?: number;
  shop_name?: string | null;
  brand?: string | null;
  category_id?: string;
};

function formatInr(n: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(n);
}

function displayPrice(p: Product, role?: string | null): { label: string; secondary?: string } {
  if (role === 'dealer') {
    const v = p.price_dealer;
    if (v == null || Number.isNaN(Number(v))) return { label: '—' };
    return { label: formatInr(Number(v)) };
  }
  if (role === 'admin' || role === 'superadmin') {
    const c = p.price_customer;
    const d = p.price_dealer;
    return {
      label: c != null ? formatInr(Number(c)) : '—',
      secondary: d != null ? `${formatInr(Number(d))} dealer` : undefined,
    };
  }
  const v = p.price_customer;
  if (v == null || Number.isNaN(Number(v))) return { label: '—' };
  return { label: formatInr(Number(v)) };
}

type Tab = 'description' | 'specs' | 'reviews' | 'returns';

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const role = typeof window !== 'undefined' ? getRole() : undefined;
  const canBuy = role === 'customer' || role === 'dealer';

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);
  const [adding, setAdding] = useState(false);
  const [qty, setQty] = useState(1);
  const [tab, setTab] = useState<Tab>('description');
  const [pincode, setPincode] = useState('');
  const [deliveryMsg, setDeliveryMsg] = useState<string | null>(null);
  const [wished, setWished] = useState(false);

  const loadProduct = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const { data } = await catalogApi.getProduct(String(id));
      setProduct(data as Product);
      setWished(isInWishlist(String(id)));
    } catch {
      toast.error('Failed to load product');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadProduct();
    }, 0);
    return () => clearTimeout(timer);
  }, [loadProduct]);

  async function addToCart() {
    if (!product) return;
    setAdding(true);
    try {
      for (let i = 0; i < qty; i += 1) {
        await cartApi.addItem(product.id, 1);
      }
      toast.success('Added to cart');
    } catch {
      toast.error('Could not add to cart');
    } finally {
      setAdding(false);
    }
  }

  function checkPincode() {
    const p = pincode.replace(/\D/g, '').slice(0, 6);
    if (p.length !== 6) {
      toast.error('Enter a valid 6-digit pincode');
      return;
    }
    setDeliveryMsg(
      'Standard delivery is available to this pincode. Estimated dispatch: 1–2 business days after payment confirmation.',
    );
  }

  if (loading) {
    return (
      <PublicShell>
        <div className="flex items-center justify-center py-32">
          <Loader2 className="animate-spin text-ev-primary" size={32} />
        </div>
      </PublicShell>
    );
  }

  if (!product) {
    return (
      <PublicShell>
        <div className="max-w-6xl mx-auto px-4 py-20 flex flex-col items-center gap-4 text-ev-muted">
          <Package size={48} className="opacity-30" />
          <p className="text-ev-text font-medium">Product not found</p>
          <Link href="/shop" className="ev-btn-secondary py-2 px-4 text-sm">
            Back to catalogue
          </Link>
        </div>
      </PublicShell>
    );
  }

  const images = Array.isArray(product.images) && product.images.length > 0 ? product.images : [];
  const price = displayPrice(product, role);
  const inStock = product.stock == null || Number(product.stock) > 0;
  const maxQty = product.stock != null ? Math.max(1, Number(product.stock)) : 99;

  return (
    <PublicShell>
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
          <div className="space-y-3">
            <div className="ev-card overflow-hidden aspect-square flex items-center justify-center bg-ev-surface2">
              {images.length > 0 ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={images[selectedImage]} alt={product.name} className="w-full h-full object-contain" />
              ) : (
                <Package size={80} className="text-ev-muted opacity-20" />
              )}
            </div>
            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {images.map((src, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setSelectedImage(i)}
                    className={`flex-shrink-0 w-16 h-16 rounded-lg border-2 overflow-hidden transition-colors ${
                      selectedImage === i ? 'border-ev-primary' : 'border-ev-border hover:border-ev-primary/50'
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-5">
            <div>
              <h1 className="text-ev-text font-bold text-2xl sm:text-3xl leading-tight">{product.name}</h1>
              {product.brand ? <p className="text-ev-muted text-sm mt-1">{product.brand}</p> : null}
            </div>

            {product.shop_name ? (
              <p className="text-sm text-ev-muted">
                Shop:{' '}
                <Link
                  href={`/shop?search=${encodeURIComponent(product.shop_name)}`}
                  className="text-ev-primary font-semibold hover:underline"
                >
                  {product.shop_name}
                </Link>
              </p>
            ) : null}

            <div>
              <p className="text-ev-primary font-bold text-3xl">{price.label}</p>
              {price.secondary ? <p className="text-ev-muted text-sm mt-0.5">{price.secondary}</p> : null}
            </div>

            <div className="flex items-center gap-2">
              <span className={`inline-block w-2 h-2 rounded-full ${inStock ? 'bg-ev-success' : 'bg-ev-error'}`} />
              <span className={`text-sm ${inStock ? 'text-ev-success' : 'text-ev-error'}`}>
                {inStock
                  ? product.stock != null
                    ? `${product.stock} in stock`
                    : 'In stock'
                  : 'Out of stock'}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <span className="text-ev-muted text-sm">Quantity</span>
              <div className="inline-flex items-center rounded-xl border border-ev-border bg-ev-surface2 overflow-hidden">
                <button
                  type="button"
                  className="px-3 py-2 text-ev-text hover:bg-ev-border/40 disabled:opacity-40"
                  disabled={qty <= 1}
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                >
                  <Minus size={16} />
                </button>
                <span className="px-4 py-2 text-sm font-semibold tabular-nums min-w-[2.5rem] text-center">{qty}</span>
                <button
                  type="button"
                  className="px-3 py-2 text-ev-text hover:bg-ev-border/40 disabled:opacity-40"
                  disabled={!inStock || qty >= maxQty}
                  onClick={() => setQty((q) => Math.min(maxQty, q + 1))}
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              {canBuy ? (
                <button
                  type="button"
                  onClick={() => void addToCart()}
                  disabled={adding || !inStock}
                  className="ev-btn-primary flex-1 py-3 flex items-center justify-center gap-2 text-base disabled:opacity-50"
                >
                  {adding ? <Loader2 size={18} className="animate-spin" /> : <ShoppingCart size={18} />}
                  {adding ? 'Adding…' : 'Add to Cart'}
                </button>
              ) : (
                <Link href="/login" className="ev-btn-primary flex-1 py-3 text-center text-base">
                  Sign in to add to cart
                </Link>
              )}
              <button
                type="button"
                onClick={() => {
                  setWished(toggleWishlistId(product.id));
                  window.dispatchEvent(new Event('ev-wishlist'));
                }}
                className="ev-btn-secondary py-3 px-4 inline-flex items-center justify-center gap-2"
              >
                <Heart size={18} className={wished ? 'text-ev-primary fill-ev-primary' : ''} />
                {wished ? 'Saved' : 'Wishlist'}
              </button>
            </div>

            {!canBuy ? (
              <p className="text-ev-muted text-sm">
                <Link href="/login" className="text-ev-primary font-medium hover:underline">
                  Sign in
                </Link>{' '}
                to add to cart or wishlist.
              </p>
            ) : null}

            <div className="ev-card p-4 space-y-3">
              <div className="flex items-start gap-2">
                <Truck size={18} className="text-ev-primary shrink-0 mt-0.5" />
                <div>
                  <p className="text-ev-text font-medium text-sm">Delivery</p>
                  <p className="text-ev-muted text-xs mt-1">
                    Enter your pincode to check delivery availability and estimated date.
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <input
                  className="ev-input flex-1 py-2 text-sm"
                  placeholder="Pincode"
                  maxLength={6}
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                />
                <button type="button" className="ev-btn-secondary px-4 text-sm shrink-0" onClick={checkPincode}>
                  Check
                </button>
              </div>
              {deliveryMsg ? <p className="text-ev-text text-xs leading-relaxed">{deliveryMsg}</p> : null}
            </div>
          </div>
        </div>

        <div className="mt-12 border-b border-ev-border flex flex-wrap gap-2">
          {(
            [
              ['description', 'Description'],
              ['specs', 'Specifications'],
              ['reviews', 'Reviews'],
              ['returns', 'Return policy'],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`px-4 py-2.5 text-sm font-medium rounded-t-lg border border-b-0 transition-colors ${
                tab === key
                  ? 'bg-ev-surface text-ev-text border-ev-border -mb-px'
                  : 'bg-transparent text-ev-muted border-transparent hover:text-ev-text'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="ev-card border-t-0 rounded-t-none p-6 min-h-[160px]">
          {tab === 'description' && (
            <p className="text-ev-muted text-sm leading-relaxed whitespace-pre-line">
              {product.description || 'No description provided for this product.'}
            </p>
          )}
          {tab === 'specs' && (
            <ul className="text-sm text-ev-muted space-y-2">
              <li>Brand: {product.brand || '—'}</li>
              <li>Category ID: {product.category_id || '—'}</li>
              <li>Product ID: {product.id}</li>
            </ul>
          )}
          {tab === 'reviews' && <p className="text-ev-muted text-sm">Reviews will appear here when available.</p>}
          {tab === 'returns' && (
            <p className="text-ev-muted text-sm leading-relaxed">
              Returns are subject to the seller&apos;s policy and product condition. Contact support within the return window
              listed on your invoice.
            </p>
          )}
        </div>
      </main>
    </PublicShell>
  );
}
