'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ChevronLeft,
  Heart,
  Loader2,
  Minus,
  Package,
  Plus,
  Share2,
  ShoppingCart,
  Star,
  Truck,
  Zap,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { cartApi, catalogApi, publicContactApi } from '@/lib/api';
import { getApiErrorMessage } from '@/lib/api-errors';
import { getRole } from '@/lib/auth';
import { PublicShell } from '@/components/public/PublicShell';
import { isInWishlist, toggleWishlistId } from '@/lib/wishlist';
import { getBrowseProductIds, recordProductBrowse } from '@/lib/browse-history';

type Product = {
  id: string;
  name: string;
  description?: string;
  price_customer?: number;
  price_dealer?: number;
  mrp?: number;
  min_order_quantity?: number;
  images?: string[];
  stock?: number;
  shop_name?: string | null;
  brand?: string | null;
  category_id?: string;
  category_name?: string | null;
  rating_avg?: number;
  rating_count?: number;
  amazon_url?: string | null;
  low_stock_threshold?: number;
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
  if (role === 'superadmin') {
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

function shortBlurb(description: string | undefined): string {
  if (!description?.trim()) return '';
  const parts = description.trim().split(/\n\s*\n/);
  const head = parts.slice(0, 2).join('\n\n').trim();
  if (head.length > 720) return `${head.slice(0, 700).trim()}…`;
  return head;
}

type TabKey = 'description' | 'reviews';

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const role = typeof window !== 'undefined' ? getRole() : undefined;
  const canBuy = role === 'customer' || role === 'dealer';

  const [product, setProduct] = useState<Product | null>(null);
  const [related, setRelated] = useState<Product[]>([]);
  const [recentProducts, setRecentProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);
  const [adding, setAdding] = useState(false);
  const [buying, setBuying] = useState(false);
  const [qty, setQty] = useState(1);
  const [tab, setTab] = useState<TabKey>('description');
  const [pincode, setPincode] = useState('');
  const [deliveryMsg, setDeliveryMsg] = useState<string | null>(null);
  const [wished, setWished] = useState(false);

  const [enqName, setEnqName] = useState('');
  const [enqEmail, setEnqEmail] = useState('');
  const [enqMessage, setEnqMessage] = useState('');
  const [enqSending, setEnqSending] = useState(false);
  const [enqDone, setEnqDone] = useState(false);

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

  useEffect(() => {
    if (!product?.id) return;
    recordProductBrowse(product.id);
  }, [product?.id]);

  useEffect(() => {
    if (!product) return;
    const m = role === 'dealer' ? Math.max(1, Number(product.min_order_quantity || 1)) : 1;
    setQty((q) => (role === 'dealer' ? Math.max(m, q) : Math.max(1, q)));
  }, [product?.id, product?.min_order_quantity, role]);

  const loadRelatedAndRecent = useCallback(async () => {
    if (!product?.id) return;
    const cid = product.category_id;
    try {
      if (cid) {
        const { data } = await catalogApi.getProducts({
          category_id: cid,
          approved_shops_only: true,
        });
        const list = (Array.isArray(data) ? data : []) as Product[];
        setRelated(list.filter((p) => p.id !== product.id).slice(0, 6));
      } else {
        setRelated([]);
      }
    } catch {
      setRelated([]);
    }

    const ids = getBrowseProductIds().filter((x) => x && x !== product.id).slice(0, 8);
    const fetched: Product[] = [];
    for (const pid of ids) {
      try {
        const { data } = await catalogApi.getProduct(pid);
        if (data && (data as Product).id) fetched.push(data as Product);
      } catch {
        /* skip */
      }
    }
    setRecentProducts(fetched.slice(0, 6));
  }, [product?.id, product?.category_id]);

  useEffect(() => {
    if (!product?.id) return;
    void loadRelatedAndRecent();
  }, [product?.id, loadRelatedAndRecent]);

  async function addToCart() {
    if (!product) return;
    setAdding(true);
    try {
      await cartApi.addItem(product.id, qty);
      toast.success('Added to cart');
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Could not add to cart'));
    } finally {
      setAdding(false);
    }
  }

  async function buyNow() {
    if (!product) return;
    if (!canBuy) {
      toast.error('Sign in as a customer or dealer to purchase');
      router.push('/login');
      return;
    }
    setBuying(true);
    try {
      await cartApi.addItem(product.id, qty);
      router.push('/checkout');
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Could not start checkout'));
    } finally {
      setBuying(false);
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

  async function shareProduct() {
    if (!product) return;
    const url = typeof window !== 'undefined' ? window.location.href : '';
    try {
      if (navigator.share) {
        await navigator.share({ title: product.name, text: product.name, url });
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        toast.success('Link copied to clipboard');
      }
    } catch {
      /* user cancelled share */
    }
  }

  async function sendEnquiry(e: React.FormEvent) {
    e.preventDefault();
    if (!product) return;
    const name = enqName.trim();
    const email = enqEmail.trim();
    const message = enqMessage.trim();
    if (!name || !email || !message) {
      toast.error('Please fill name, email, and message');
      return;
    }
    const parts = name.split(/\s+/);
    const first_name = parts[0] || name;
    const last_name = parts.slice(1).join(' ') || first_name;
    setEnqSending(true);
    try {
      await publicContactApi.submitMessage({
        first_name,
        last_name,
        email,
        message: `[Product enquiry: ${product.name} (id: ${product.id})]\n\n${message}`,
      });
      setEnqDone(true);
      toast.success('Enquiry sent — we will get back to you soon.');
      setEnqName('');
      setEnqEmail('');
      setEnqMessage('');
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Could not send enquiry'));
    } finally {
      setEnqSending(false);
    }
  }

  const blurbs = useMemo(() => shortBlurb(product?.description), [product?.description]);
  const reviewCount = Number(product?.rating_count || 0);
  const ratingAvg = Number(product?.rating_avg || 0);

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
        <div className="ev-container py-20 flex flex-col items-center gap-4 text-ev-muted w-full min-w-0">
          <Package size={48} className="opacity-30" />
          <p className="text-ev-text font-medium">Product not found</p>
          <Link href="/shop" className="ev-btn-secondary py-2 px-4 text-sm">
            Back to products
          </Link>
        </div>
      </PublicShell>
    );
  }

  const images = Array.isArray(product.images) && product.images.length > 0 ? product.images : [];
  const price = displayPrice(product, role);
  const inStock = product.stock == null || Number(product.stock) > 0;
  const dealerMin = role === 'dealer' ? Math.max(1, Number(product.min_order_quantity || 1)) : 1;
  const maxQty = product.stock != null ? Math.max(1, Number(product.stock)) : 99;
  const mrp = role === 'dealer' ? Number(product.mrp || 0) : 0;
  const dealerUnit = role === 'dealer' ? Number(product.price_dealer || 0) : 0;
  const lowTh = Number(product.low_stock_threshold ?? 10);
  const stockNum = product.stock != null ? Number(product.stock) : null;
  const showUrgency = inStock && stockNum != null && stockNum > 0 && stockNum <= lowTh;
  return (
    <PublicShell>
      <main className="ev-container py-6 sm:py-8 w-full min-w-0">
        <Link
          href="/shop"
          className="inline-flex items-center gap-1 text-sm font-medium text-ev-primary hover:underline mb-6"
        >
          <ChevronLeft size={18} />
          Back to products
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-start">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            {images.length > 1 ? (
              <div className="flex sm:flex-col gap-2 order-2 sm:order-1 overflow-x-auto sm:overflow-visible pb-1 sm:pb-0 sm:w-[88px] shrink-0">
                {images.map((src, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setSelectedImage(i)}
                    className={`flex-shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-lg border-2 overflow-hidden transition-colors ${
                      selectedImage === i ? 'border-ev-primary ring-2 ring-ev-primary/20' : 'border-ev-border hover:border-ev-primary/50'
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            ) : null}
            <div className="flex-1 order-1 sm:order-2 min-w-0">
              <div className="ev-card overflow-hidden aspect-square flex items-center justify-center bg-ev-surface2">
                {images.length > 0 ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={images[selectedImage]}
                    alt={`${product.name} - Image ${selectedImage + 1}`}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <Package size={80} className="text-ev-muted opacity-20" />
                )}
              </div>
            </div>
          </div>

          <div className="space-y-4 sm:space-y-5">
            <div>
              <h1 className="text-ev-text font-bold text-2xl sm:text-3xl leading-tight">{product.name}</h1>
              {product.brand ? <p className="text-ev-muted text-sm mt-1">{product.brand}</p> : null}
            </div>

            {ratingAvg > 0 ? (
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <div className="flex items-center gap-0.5 text-amber-500" aria-label={`Rated ${ratingAvg.toFixed(2)} out of 5`}>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      size={16}
                      className={i < Math.round(ratingAvg) ? 'fill-amber-400 text-amber-500' : 'text-ev-border'}
                    />
                  ))}
                </div>
                <span className="text-ev-text font-medium">Rated {ratingAvg.toFixed(2)} out of 5</span>
                {reviewCount > 0 ? (
                  <span className="text-ev-muted">
                    based on {reviewCount} customer rating{reviewCount === 1 ? '' : 's'} ({reviewCount} customer review
                    {reviewCount === 1 ? '' : 's'})
                  </span>
                ) : null}
              </div>
            ) : null}

            {blurbs ? (
              <p className="text-ev-muted text-sm leading-relaxed whitespace-pre-line border-l-2 border-ev-primary/40 pl-4">
                {blurbs}
              </p>
            ) : null}

            {product.shop_name ? (
              <p className="text-sm text-ev-muted">
                Shop:{' '}
                <Link
                  href={`/shop?search=${encodeURIComponent(product.shop_name)}`}
                  className="inline-flex items-center rounded-lg border border-ev-border bg-ev-surface2 px-2.5 py-1 text-sm font-semibold text-ev-primary hover:border-ev-primary/40 transition-colors"
                >
                  {product.shop_name}
                </Link>
              </p>
            ) : null}

            <div>
              {role === 'dealer' ? (
                <>
                  <span className="inline-flex items-center rounded-md bg-ev-indigo/15 text-ev-indigo text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 mb-2">
                    Dealer price
                  </span>
                  <p className="text-ev-primary font-bold text-3xl">{price.label}</p>
                  {mrp > 0 && dealerUnit > 0 ? (
                    <p className="text-sm text-ev-muted mt-2">
                      <span className="text-ev-success font-semibold">
                        You save {formatInr(Math.max(0, mrp - dealerUnit))} vs retail
                      </span>
                      <span className="mx-1">·</span>
                      <span className="line-through text-ev-subtle">MRP {formatInr(mrp)}</span>
                    </p>
                  ) : null}
                  {dealerMin > 1 ? (
                    <p className="text-xs text-ev-warning font-medium mt-2">Minimum order: {dealerMin} units (set by shop)</p>
                  ) : null}
                </>
              ) : (
                <>
                  <p className="text-ev-primary font-bold text-3xl">{price.label}</p>
                  {price.secondary ? <p className="text-ev-muted text-sm mt-0.5">{price.secondary}</p> : null}
                </>
              )}
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

            {showUrgency ? (
              <div className="flex items-start gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-ev-text">
                <Zap size={18} className="text-amber-600 shrink-0 mt-0.5" />
                <span className="font-semibold">Hurry! Only a few left — order now</span>
              </div>
            ) : null}

            <div className="flex flex-wrap items-center gap-3">
              <span className="text-ev-muted text-sm shrink-0">{product.name} quantity</span>
              <div className="inline-flex items-center rounded-xl border border-ev-border bg-ev-surface2 overflow-hidden">
                <button
                  type="button"
                  className="px-3 py-2 text-ev-text hover:bg-ev-border/40 disabled:opacity-40"
                  disabled={qty <= (role === 'dealer' ? dealerMin : 1)}
                  onClick={() => setQty((q) => Math.max(role === 'dealer' ? dealerMin : 1, q - 1))}
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

            <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
              {canBuy ? (
                <>
                  <button
                    type="button"
                    onClick={() => void addToCart()}
                    disabled={adding || !inStock}
                    className="ev-btn-primary flex-1 min-w-[140px] py-3 flex items-center justify-center gap-2 text-base disabled:opacity-50"
                  >
                    {adding ? <Loader2 size={18} className="animate-spin" /> : <ShoppingCart size={18} />}
                    {adding ? 'Adding…' : 'Add to cart'}
                  </button>
                  <button
                    type="button"
                    onClick={() => void buyNow()}
                    disabled={buying || !inStock}
                    className="ev-btn-secondary flex-1 min-w-[140px] py-3 text-base font-semibold border-ev-primary text-ev-primary hover:bg-ev-primary/10 disabled:opacity-50"
                  >
                    {buying ? <Loader2 size={18} className="animate-spin inline" /> : null}
                    {buying ? 'Please wait…' : 'Buy now'}
                  </button>
                </>
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
                {wished ? 'Added to wishlist' : 'Add to wishlist'}
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <span className="text-ev-muted text-sm font-medium">Share:</span>
              <button
                type="button"
                onClick={() => void shareProduct()}
                className="inline-flex items-center gap-1.5 text-sm text-ev-primary font-medium hover:underline"
              >
                <Share2 size={16} />
                Share this product
              </button>
            </div>

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

        <div className="mt-10 sm:mt-12 border-b border-ev-border flex flex-wrap gap-2">
          {(
            [
              ['description', 'Description'],
              ['reviews', reviewCount > 0 ? `Reviews (${reviewCount})` : 'Reviews'],
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
        <div className="ev-card border-t-0 rounded-t-none p-6 min-h-[120px]">
          {tab === 'description' && (
            <div className="text-ev-muted text-sm leading-relaxed whitespace-pre-line space-y-4">
              <p>{product.description || 'No description provided for this product.'}</p>
            </div>
          )}
          {tab === 'reviews' && (
            <div className="space-y-4 text-sm text-ev-muted">
              {ratingAvg > 0 ? (
                <p className="text-ev-text">
                  Average rating: <strong>{ratingAvg.toFixed(2)}</strong> out of 5
                  {reviewCount > 0 ? (
                    <>
                      {' '}
                      from <strong>{reviewCount}</strong> review{reviewCount === 1 ? '' : 's'}
                    </>
                  ) : null}
                  .
                </p>
              ) : (
                <p>No ratings yet for this product.</p>
              )}
              <p className="leading-relaxed">
                Detailed written reviews will appear here when the storefront review feature is enabled. Your order and
                product experience still matter — use the enquiry form below if you need help before you buy.
              </p>
            </div>
          )}
        </div>

        {product.amazon_url ? (
          <section className="mt-10 rounded-xl border border-ev-border bg-ev-surface2 p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="text-ev-text font-semibold">You can buy from Amazon</p>
              <p className="text-ev-muted text-sm mt-1">Opens the seller listing in a new tab.</p>
            </div>
            <a
              href={product.amazon_url}
              target="_blank"
              rel="noopener noreferrer"
              className="ev-btn-primary py-3 px-6 text-center shrink-0"
            >
              Buy now from Amazon
            </a>
          </section>
        ) : null}

        <section className="mt-10 ev-card p-6 sm:p-8">
          <h2 className="text-ev-text font-bold text-lg mb-2">Send enquiry</h2>
          <p className="text-ev-muted text-sm mb-6">
            Please fill out the form for any questions or inquiries about this product.
          </p>
          {enqDone ? (
            <p className="text-ev-success text-sm font-medium">Thank you — your enquiry was sent successfully.</p>
          ) : (
            <form className="grid grid-cols-1 sm:grid-cols-2 gap-4" onSubmit={sendEnquiry}>
              <div className="sm:col-span-2">
                <label className="ev-label text-xs">Name</label>
                <input className="ev-input mt-1" value={enqName} onChange={(e) => setEnqName(e.target.value)} placeholder="Your name" />
              </div>
              <div className="sm:col-span-2">
                <label className="ev-label text-xs">Email</label>
                <input
                  type="email"
                  className="ev-input mt-1"
                  value={enqEmail}
                  onChange={(e) => setEnqEmail(e.target.value)}
                  placeholder="you@example.com"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="ev-label text-xs">Message</label>
                <textarea
                  className="ev-input mt-1 min-h-[120px] resize-y"
                  value={enqMessage}
                  onChange={(e) => setEnqMessage(e.target.value)}
                  placeholder="Your question…"
                />
              </div>
              <div className="sm:col-span-2">
                <button type="submit" className="ev-btn-primary py-3 px-8 disabled:opacity-50" disabled={enqSending}>
                  {enqSending ? 'Sending…' : 'Send enquiry'}
                </button>
              </div>
            </form>
          )}
        </section>

        {related.length > 0 ? (
          <section className="mt-12">
            <h2 className="text-ev-text font-bold text-xl mb-6">Related products</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {related.map((p) => {
                const img = p.images?.[0];
                const pr = displayPrice(p, role);
                const ok = p.stock == null || Number(p.stock) > 0;
                return (
                  <div key={p.id} className="ev-card overflow-hidden flex flex-col">
                    <Link href={`/products/${p.id}`} className="block aspect-[4/3] bg-ev-surface2 relative">
                      {img ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={img} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="text-ev-muted opacity-30" size={40} />
                        </div>
                      )}
                    </Link>
                    <div className="p-4 flex flex-col flex-1 gap-2">
                      <p className="text-ev-muted text-xs line-clamp-1">{p.category_name || p.brand || 'Product'}</p>
                      <Link href={`/products/${p.id}`} className="font-semibold text-ev-text line-clamp-2 hover:text-ev-primary">
                        {p.name}
                      </Link>
                      <p className="text-ev-primary font-bold">{pr.label}</p>
                      <div className="mt-auto pt-2">
                        {ok ? (
                          <Link href={`/products/${p.id}`} className="ev-btn-primary py-2 px-4 text-sm inline-block text-center w-full">
                            View product
                          </Link>
                        ) : (
                          <span className="text-ev-error text-sm">Out of stock</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ) : null}

        {recentProducts.length > 0 ? (
          <section className="mt-12 mb-8">
            <h2 className="text-ev-text font-bold text-xl mb-6">Recently viewed</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              {recentProducts.map((p) => {
                const img = p.images?.[0];
                const pr = displayPrice(p, role);
                const r = Number(p.rating_avg || 0);
                return (
                  <Link key={p.id} href={`/products/${p.id}`} className="ev-card overflow-hidden group">
                    <div className="aspect-square bg-ev-surface2">
                      {img ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={img} alt="" className="w-full h-full object-cover group-hover:opacity-95" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="text-ev-muted opacity-25" size={32} />
                        </div>
                      )}
                    </div>
                    <div className="p-3">
                      <p className="text-xs font-medium text-ev-text line-clamp-2">{p.name}</p>
                      {r > 0 ? <p className="text-[10px] text-ev-muted mt-1">Rated {r.toFixed(2)} out of 5</p> : null}
                      <p className="text-sm font-bold text-ev-primary mt-1">{pr.label}</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        ) : null}
      </main>
    </PublicShell>
  );
}
