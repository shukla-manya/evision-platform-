'use client';

import { use, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Loader2, Plus, ShoppingCart } from 'lucide-react';
import toast from 'react-hot-toast';
import { cartApi, catalogApi } from '@/lib/api';
import { getRole } from '@/lib/auth';

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
};

function formatInr(n: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(n);
}

function displayPrice(p: Product, role?: string | null) {
  if (role === 'dealer') {
    const v = p.price_dealer;
    if (v == null || Number.isNaN(Number(v))) return '—';
    return formatInr(Number(v));
  }
  if (role === 'admin' || role === 'superadmin') {
    const c = p.price_customer;
    const d = p.price_dealer;
    if (c != null && d != null) return `${formatInr(Number(c))} retail · ${formatInr(Number(d))} dealer`;
    const v = c ?? d;
    return v == null ? '—' : formatInr(Number(v));
  }
  const v = p.price_customer;
  return v == null ? '—' : formatInr(Number(v));
}

export default function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const role = typeof window !== 'undefined' ? getRole() : undefined;
  const canAddToCart = useMemo(() => role === 'customer' || role === 'dealer', [role]);
  const [loading, setLoading] = useState(true);
  const [product, setProduct] = useState<Product | null>(null);
  const [activeImage, setActiveImage] = useState(0);

  const loadProduct = useCallback(async () => {
    setLoading(true);
    try {
      const r = await catalogApi.getProduct(id);
      setProduct((r.data || null) as Product | null);
    } catch {
      toast.error('Could not load product');
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

  return (
    <div className="min-h-screen bg-ev-bg">
      <header className="border-b border-ev-border bg-ev-surface/90 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <Link href="/shop" className="ev-btn-secondary text-sm py-2 px-3 inline-flex items-center gap-1.5">
            <ArrowLeft size={14} />
            Back to shop
          </Link>
          {canAddToCart ? (
            <Link href="/cart" className="ev-btn-secondary text-sm py-2 px-3 inline-flex items-center gap-1.5">
              <ShoppingCart size={15} />
              Cart
            </Link>
          ) : null}
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-ev-muted gap-2">
            <Loader2 className="animate-spin text-ev-primary" size={24} />
            Loading...
          </div>
        ) : !product ? (
          <div className="ev-card p-12 text-center text-ev-muted">Product not found.</div>
        ) : (
          <div className="grid lg:grid-cols-[1fr_1fr] gap-6">
            <section className="ev-card p-4">
              <div className="aspect-[4/3] rounded-xl overflow-hidden bg-ev-surface2 border border-ev-border mb-3">
                {product.images?.[activeImage] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={product.images[activeImage]} alt={product.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-ev-subtle text-sm">No image</div>
                )}
              </div>
              {product.images && product.images.length > 1 ? (
                <div className="grid grid-cols-5 gap-2">
                  {product.images.map((img, i) => (
                    <button
                      key={img + i}
                      type="button"
                      className={`aspect-square rounded-lg overflow-hidden border ${activeImage === i ? 'border-ev-primary' : 'border-ev-border'}`}
                      onClick={() => setActiveImage(i)}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={img} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              ) : null}
            </section>

            <section className="ev-card p-6">
              <p className="text-ev-subtle text-xs uppercase tracking-wide mb-1">{product.shop_name || 'Partner shop'}</p>
              <h1 className="text-2xl font-bold text-ev-text mb-2">{product.name}</h1>
              {product.brand ? <p className="text-ev-muted text-sm mb-3">Brand: {product.brand}</p> : null}
              <p className="text-3xl font-bold text-ev-text mb-4">{displayPrice(product, role)}</p>
              <p className="text-ev-muted text-sm leading-relaxed mb-6">{product.description}</p>
              <p className="text-ev-subtle text-xs mb-6">
                {product.stock != null ? (product.stock > 0 ? `${product.stock} in stock` : 'Out of stock') : 'Stock unavailable'}
              </p>
              <div className="flex gap-3">
                {canAddToCart ? (
                  <button
                    type="button"
                    className="ev-btn-primary py-2.5 px-5 inline-flex items-center gap-2"
                    onClick={async () => {
                      try {
                        await cartApi.addItem(product.id, 1);
                        toast.success('Added to cart');
                      } catch {
                        toast.error('Could not add to cart');
                      }
                    }}
                  >
                    <Plus size={16} />
                    Add to cart
                  </button>
                ) : (
                  <Link href="/login" className="ev-btn-primary py-2.5 px-5">Sign in to buy</Link>
                )}
                <Link href="/checkout" className="ev-btn-secondary py-2.5 px-4">Checkout</Link>
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
