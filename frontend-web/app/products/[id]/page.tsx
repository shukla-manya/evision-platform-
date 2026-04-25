'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ShoppingCart, Loader2, Package } from 'lucide-react';
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

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const role = typeof window !== 'undefined' ? getRole() : undefined;
  const canBuy = role === 'customer' || role === 'dealer';

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);
  const [adding, setAdding] = useState(false);

  const loadProduct = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const { data } = await catalogApi.getProduct(id);
      setProduct(data as Product);
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
      await cartApi.addItem(product.id);
      toast.success('Added to cart');
    } catch {
      toast.error('Could not add to cart');
    } finally {
      setAdding(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-ev-bg flex items-center justify-center">
        <Loader2 className="animate-spin text-ev-primary" size={32} />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-ev-bg flex flex-col items-center justify-center gap-4 text-ev-muted">
        <Package size={48} className="opacity-30" />
        <p className="text-ev-text font-medium">Product not found</p>
        <Link href="/shop" className="ev-btn-secondary py-2 px-4 text-sm">Back to shop</Link>
      </div>
    );
  }

  const images = Array.isArray(product.images) && product.images.length > 0 ? product.images : [];
  const price = displayPrice(product, role);
  const inStock = product.stock == null || Number(product.stock) > 0;

  return (
    <div className="min-h-screen bg-ev-bg">
      <header className="ev-header">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-3">
          <Link href="/shop" className="text-white/70 hover:text-white transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <span className="text-white font-semibold text-sm sm:text-base truncate">{product.name}</span>
          {canBuy && (
            <Link href="/cart" className="ml-auto ev-btn-secondary py-2 px-3 text-sm flex items-center gap-1.5">
              <ShoppingCart size={15} />
              Cart
            </Link>
          )}
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
          {/* Images */}
          <div className="space-y-3">
            <div className="ev-card overflow-hidden aspect-square flex items-center justify-center bg-ev-surface2">
              {images.length > 0 ? (
                <img
                  src={images[selectedImage]}
                  alt={product.name}
                  className="w-full h-full object-contain"
                />
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
                    <img src={src} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Details */}
          <div className="space-y-5">
            <div>
              <h1 className="text-ev-text font-bold text-2xl sm:text-3xl leading-tight">{product.name}</h1>
              {product.brand && (
                <p className="text-ev-muted text-sm mt-1">{product.brand}</p>
              )}
            </div>

            <div>
              <p className="text-ev-primary font-bold text-3xl">{price.label}</p>
              {price.secondary && (
                <p className="text-ev-muted text-sm mt-0.5">{price.secondary}</p>
              )}
            </div>

            {product.shop_name && (
              <div className="ev-card p-3 flex items-center gap-2">
                <span className="text-ev-muted text-xs">Sold by</span>
                <span className="text-ev-text text-sm font-medium">{product.shop_name}</span>
              </div>
            )}

            <div className="flex items-center gap-2">
              <span
                className={`inline-block w-2 h-2 rounded-full ${inStock ? 'bg-ev-success' : 'bg-ev-error'}`}
              />
              <span className={`text-sm ${inStock ? 'text-ev-success' : 'text-ev-error'}`}>
                {inStock
                  ? product.stock != null
                    ? `${product.stock} in stock`
                    : 'In stock'
                  : 'Out of stock'}
              </span>
            </div>

            {product.description && (
              <div>
                <h2 className="text-ev-text font-semibold text-sm mb-1.5">Description</h2>
                <p className="text-ev-muted text-sm leading-relaxed whitespace-pre-line">{product.description}</p>
              </div>
            )}

            {canBuy && (
              <button
                type="button"
                onClick={() => void addToCart()}
                disabled={adding || !inStock}
                className="ev-btn-primary w-full py-3 flex items-center justify-center gap-2 text-base disabled:opacity-50"
              >
                {adding ? <Loader2 size={18} className="animate-spin" /> : <ShoppingCart size={18} />}
                {adding ? 'Adding…' : 'Add to cart'}
              </button>
            )}

            {!canBuy && !role && (
              <div className="ev-card p-4 text-center text-ev-muted text-sm">
                <Link href="/login" className="text-ev-primary hover:underline">Sign in</Link> to purchase this product.
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
