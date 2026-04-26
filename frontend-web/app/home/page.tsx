'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Clock, Loader2, Package, Sparkles, Wrench } from 'lucide-react';
import toast from 'react-hot-toast';
import { authApi, catalogApi, ordersApi } from '@/lib/api';
import { getRole } from '@/lib/auth';
import { PublicShell } from '@/components/public/PublicShell';
import { getBrowseProductIds } from '@/lib/browse-history';

type User = {
  name?: string;
  email?: string;
};

type Category = { id: string; name: string; parent_id?: string | null };

type Product = {
  id: string;
  name: string;
  price_customer?: number;
  price_dealer?: number;
  images?: string[];
  shop_name?: string | null;
};

type SubOrder = { id: string; status?: string };
type OrderGroup = { id: string; sub_orders?: SubOrder[] };

function firstName(name?: string) {
  if (!name?.trim()) return 'there';
  return name.trim().split(/\s+/)[0] || 'there';
}

function formatInr(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
}

function priceLabel(p: Product, shopperRole?: string) {
  if (shopperRole === 'dealer' && p.price_dealer != null) return formatInr(Number(p.price_dealer));
  if (p.price_customer != null) return formatInr(Number(p.price_customer));
  return '—';
}

const inTransit = new Set(['shipment_created', 'picked_up', 'in_transit', 'out_for_delivery']);

function endOfTodayMs() {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d.getTime();
}

export default function CustomerHomePage() {
  const role = typeof window !== 'undefined' ? getRole() : undefined;
  const isShopper = role === 'customer' || role === 'dealer';

  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [orders, setOrders] = useState<OrderGroup[]>([]);
  const [forYou, setForYou] = useState<Product[]>([]);
  const [deals, setDeals] = useState<Product[]>([]);
  const [now, setNow] = useState(Date.now());

  const load = useCallback(async () => {
    if (!isShopper) return;
    setLoading(true);
    try {
      const [meRes, catRes, ordRes, allRes] = await Promise.all([
        authApi.me(),
        catalogApi.getCategories(),
        ordersApi.myOrders().catch(() => ({ data: [] })),
        catalogApi.getProducts({}).catch(() => ({ data: [] })),
      ]);
      const u = (meRes.data as { user?: User })?.user;
      setUser(u || null);
      setCategories(Array.isArray(catRes.data) ? catRes.data : []);
      setOrders(Array.isArray(ordRes.data) ? (ordRes.data as OrderGroup[]) : []);
      const all = Array.isArray(allRes.data) ? (allRes.data as Product[]) : [];
      const browseIds = getBrowseProductIds();
      const byId = new Map(all.map((p) => [p.id, p]));
      const rec = browseIds.map((id) => byId.get(id)).filter(Boolean) as Product[];
      setForYou(rec.slice(0, 8));
      setDeals(all.filter((p) => p.price_customer != null).slice(0, 6));
    } catch {
      toast.error('Could not load your home');
    } finally {
      setLoading(false);
    }
  }, [isShopper]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const transitCount = useMemo(() => {
    let n = 0;
    for (const g of orders) {
      for (const s of g.sub_orders || []) {
        if (inTransit.has(String(s.status || '').toLowerCase())) n += 1;
      }
    }
    return n;
  }, [orders]);

  const dealEnds = endOfTodayMs();
  const countdown = Math.max(0, Math.floor((dealEnds - now) / 1000));
  const hh = String(Math.floor(countdown / 3600)).padStart(2, '0');
  const mm = String(Math.floor((countdown % 3600) / 60)).padStart(2, '0');
  const ss = String(countdown % 60).padStart(2, '0');

  if (!isShopper) {
    return (
      <PublicShell>
        <main className="max-w-lg mx-auto px-4 py-20 text-center text-ev-muted">
          <p className="text-ev-text font-medium mb-2">Signed-in home</p>
          <p className="text-sm mb-6">Sign in as a customer or dealer to see orders, deals, and technician booking.</p>
          <Link href="/login" className="ev-btn-primary inline-flex">
            Sign in
          </Link>
        </main>
      </PublicShell>
    );
  }

  if (loading) {
    return (
      <PublicShell>
        <div className="flex flex-col items-center justify-center py-32 text-ev-muted gap-2">
          <Loader2 className="animate-spin text-ev-primary" size={28} />
          <span className="text-sm">Loading your space…</span>
        </div>
      </PublicShell>
    );
  }

  const topCats = categories.filter((c) => !c.parent_id).slice(0, 12);

  return (
    <PublicShell>
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-10">
        <header className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-bold text-ev-text">
            Hey {firstName(user?.name)} 👋
          </h1>
          <p className="text-ev-muted text-sm">
            Your e vision dashboard — orders, deals, and service in one place.
            {role === 'dealer' ? (
              <span className="block mt-1 text-ev-subtle">
                Dealer pricing applies in the shop; open Dealer hub for GST invoices and wholesale stats.
              </span>
            ) : null}
          </p>
        </header>

        {transitCount > 0 ? (
          <Link
            href="/orders"
            className="flex items-center justify-between gap-4 ev-card p-5 bg-gradient-to-r from-ev-primary/10 to-transparent border-ev-primary/25 hover:border-ev-primary/40 transition-colors"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-12 h-12 rounded-xl bg-ev-primary/15 flex items-center justify-center shrink-0">
                <Package className="text-ev-primary" size={24} />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-ev-text">
                  {transitCount} {transitCount === 1 ? 'shipment' : 'shipments'} on the way
                </p>
                <p className="text-ev-muted text-xs truncate">Track packages and invoices from My orders.</p>
              </div>
            </div>
            <span className="ev-btn-secondary text-sm py-2 px-4 shrink-0 inline-flex items-center gap-1">
              Track now <ArrowRight size={14} />
            </span>
          </Link>
        ) : null}

        <section>
          <h2 className="text-lg font-bold text-ev-text mb-3 flex items-center gap-2">
            <Sparkles size={18} className="text-ev-primary" />
            Shop by category
          </h2>
          <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-thin">
            {topCats.length === 0 ? (
              <p className="text-ev-muted text-sm">Categories loading…</p>
            ) : (
              topCats.map((c) => (
                <Link
                  key={c.id}
                  href={`/shop?category_id=${encodeURIComponent(c.id)}`}
                  className="shrink-0 px-4 py-2.5 rounded-full border border-ev-border bg-ev-surface2 text-sm font-medium text-ev-text hover:border-ev-primary/40 hover:bg-ev-primary/5 transition-colors"
                >
                  {c.name}
                </Link>
              ))
            )}
          </div>
        </section>

        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-ev-text">For you</h2>
            <Link href="/shop" className="text-sm text-ev-primary font-medium hover:underline">
              Browse all
            </Link>
          </div>
          {forYou.length === 0 ? (
            <div className="ev-card p-8 text-center text-ev-muted text-sm">
              Explore products to build personalised recommendations from your browse history.
              <div className="mt-4">
                <Link href="/shop" className="ev-btn-primary text-sm py-2 px-4 inline-flex">
                  Start browsing
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {forYou.map((p) => (
                <Link key={p.id} href={`/products/${p.id}`} className="ev-card overflow-hidden group">
                  <div className="aspect-square bg-ev-surface2 border-b border-ev-border relative">
                    {p.images?.[0] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.images[0]} alt="" className="absolute inset-0 w-full h-full object-cover" />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-ev-subtle text-xs">No image</div>
                    )}
                  </div>
                  <div className="p-3">
                    <p className="text-sm font-medium text-ev-text line-clamp-2 group-hover:text-ev-primary">{p.name}</p>
                    <p className="text-ev-primary font-semibold text-sm mt-1">{priceLabel(p, role)}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className="ev-card p-6 border-ev-warning/20 bg-ev-warning/5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-ev-text flex items-center gap-2">
                <Clock size={18} className="text-ev-warning" />
                Today&apos;s deals
              </h2>
              <p className="text-ev-muted text-sm mt-1">Flash picks from the catalogue — ends at midnight.</p>
              <p className="text-2xl font-mono font-bold text-ev-text tracking-tight mt-2">
                {hh}:{mm}:{ss}
              </p>
            </div>
            <Link href="/deals" className="ev-btn-primary text-sm py-2.5 px-5 self-start">
              View all deals
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-6">
            {deals.slice(0, 3).map((p) => (
              <Link key={p.id} href={`/products/${p.id}`} className="rounded-xl border border-ev-border overflow-hidden bg-ev-surface hover:border-ev-primary/30 transition-colors">
                <div className="aspect-[4/3] bg-ev-surface2 relative">
                  {p.images?.[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.images[0]} alt="" className="absolute inset-0 w-full h-full object-cover" />
                  ) : null}
                </div>
                <div className="p-2.5">
                  <p className="text-xs font-medium text-ev-text line-clamp-2">{p.name}</p>
                  <p className="text-ev-primary text-sm font-bold mt-1">{priceLabel(p, role)}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-ev-border bg-ev-surface2/80 p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-xl bg-ev-primary/10 flex items-center justify-center shrink-0">
              <Wrench className="text-ev-primary" size={22} />
            </div>
            <div>
              <h2 className="font-bold text-ev-text">Need a technician?</h2>
              <p className="text-ev-muted text-sm mt-1 max-w-xl">
                Book one for a product you&apos;ve already received — installation, troubleshooting, and more.
              </p>
            </div>
          </div>
          <Link href="/orders" className="ev-btn-secondary text-sm py-2.5 px-5 shrink-0">
            Book now
          </Link>
        </section>

        <div className="grid sm:grid-cols-2 gap-4">
          <Link href="/orders" className="ev-card p-5 hover:border-ev-primary/30 transition-colors block">
            <p className="text-ev-muted text-xs uppercase tracking-wide mb-1">Orders</p>
            <p className="text-lg font-bold text-ev-text">My orders</p>
            <p className="text-ev-subtle text-sm mt-2">Track shipments and download invoices.</p>
          </Link>
          <Link href="/cart" className="ev-card p-5 hover:border-ev-primary/30 transition-colors block">
            <p className="text-ev-muted text-xs uppercase tracking-wide mb-1">Bag</p>
            <p className="text-lg font-bold text-ev-text">My cart</p>
            <p className="text-ev-subtle text-sm mt-2">Multi-shop checkout in one payment.</p>
          </Link>
        </div>
      </main>
    </PublicShell>
  );
}
