'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { superadminApi, catalogApi } from '@/lib/api';
import { getApiErrorMessage } from '@/lib/api-errors';
import { SuperadminShell } from '@/components/superadmin/SuperadminShell';

type Category = { id: string; name: string; parent_id?: string | null };

type Product = {
  id: string;
  name: string;
  description: string;
  price_customer: number;
  price_dealer: number;
  stock: number;
  category_id: string;
  brand?: string | null;
  active?: boolean;
  images?: string[];
  low_stock_threshold?: number;
  mrp?: number | null;
  min_order_quantity?: number;
  amazon_url?: string | null;
};

export default function AdminProductEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [form, setForm] = useState({
    name: '',
    description: '',
    price_customer: '',
    price_dealer: '',
    stock: '',
    category_id: '',
    brand: '',
    active: true,
    low_stock_threshold: '10',
    mrp: '',
    min_order_quantity: '1',
    images: [] as string[],
    amazon_url: '',
  });

  useEffect(() => {
    catalogApi
      .getCategories()
      .then((r) => setCategories(r.data || []))
      .catch(() => toast.error('Could not load categories'));
  }, []);

  useEffect(() => {
    superadminApi
      .getCatalogProduct(id)
      .then((r) => {
        const p = r.data as Product;
        setForm({
          name: p.name || '',
          description: p.description || '',
          price_customer: String(p.price_customer ?? ''),
          price_dealer: String(p.price_dealer ?? ''),
          stock: String(p.stock ?? ''),
          category_id: p.category_id || '',
          brand: (p.brand as string) || '',
          active: p.active !== false,
          low_stock_threshold: String(p.low_stock_threshold ?? 10),
          mrp: p.mrp != null && !Number.isNaN(Number(p.mrp)) ? String(p.mrp) : '',
          min_order_quantity: String(Math.max(1, Number(p.min_order_quantity ?? 1))),
          images: Array.isArray(p.images) ? p.images : [],
          amazon_url: typeof p.amazon_url === 'string' ? p.amazon_url : '',
        });
      })
      .catch(() => {
        toast.error('Product not found');
        router.push('/super/products');
      })
      .finally(() => setLoading(false));
  }, [id, router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      let nextImages = [...form.images];
      if (files.length > 0) {
        const up = await superadminApi.uploadCatalogProductImages(files);
        const urls = (up.data as { urls?: string[] })?.urls || [];
        nextImages = [...nextImages, ...urls];
      }
      await superadminApi.updateCatalogProduct(id, {
        name: form.name.trim(),
        description: form.description.trim(),
        price_customer: Number(form.price_customer),
        price_dealer: Number(form.price_dealer),
        stock: Number(form.stock),
        category_id: form.category_id,
        brand: form.brand.trim() || null,
        active: form.active,
        low_stock_threshold: Number(form.low_stock_threshold) || 10,
        min_order_quantity: Math.max(1, Number(form.min_order_quantity) || 1),
        mrp: form.mrp.trim() === '' ? null : Number(form.mrp),
        images: nextImages,
        amazon_url: form.amazon_url.trim() === '' ? null : form.amazon_url.trim(),
      });
      toast.success('Product updated');
      router.push('/super/products');
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Could not update product'));
    } finally {
      setSaving(false);
    }
  }

  async function onDelete() {
    if (!confirm('Delete this product permanently?')) return;
    try {
      await superadminApi.deleteCatalogProduct(id);
      toast.success('Product deleted');
      router.push('/super/products');
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Could not delete'));
    }
  }

  if (loading) {
    return (
      <SuperadminShell>
        <main className="w-full min-w-0 flex items-center gap-2 py-8 text-ev-muted">
          <Loader2 className="animate-spin text-ev-primary" size={22} />
          Loading…
        </main>
      </SuperadminShell>
    );
  }

  return (
    <SuperadminShell>
      <main className="w-full min-w-0 max-w-3xl">
        <Link href="/super/products" className="text-ev-muted text-sm inline-flex items-center gap-1 hover:text-ev-text mb-4">
          <ArrowLeft size={14} /> Products
        </Link>
        <h1 className="text-2xl font-bold text-ev-text mb-2">Edit product</h1>
        <p className="text-ev-muted text-sm mb-6">Update catalogue details and pricing.</p>
        <form onSubmit={onSubmit} className="ev-card p-6 sm:p-8 space-y-5">
          <div>
            <label className="ev-label">Product name</label>
            <input
              className="ev-input"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
            />
          </div>
          <div>
            <label className="ev-label">Description</label>
            <textarea
              className="ev-input min-h-[100px]"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              required
            />
          </div>
          <div>
            <label className="ev-label">Category</label>
            <select
              className="ev-input"
              value={form.category_id}
              onChange={(e) => setForm((f) => ({ ...f, category_id: e.target.value }))}
              required
            >
              <option value="">Select category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.parent_id ? `↳ ${c.name}` : c.name}
                </option>
              ))}
            </select>
          </div>
          {form.images.length > 0 ? (
            <div>
              <p className="ev-label">Current images</p>
              <ul className="text-xs text-ev-muted font-mono space-y-1 break-all max-h-32 overflow-y-auto border border-ev-border rounded-xl p-3 bg-ev-surface2">
                {form.images.map((u) => (
                  <li key={u}>{u}</li>
                ))}
              </ul>
              <p className="text-ev-subtle text-xs mt-1">Upload more below; all images are saved together.</p>
            </div>
          ) : null}
          <div>
            <label className="ev-label">Upload images (multiple)</label>
            <input
              type="file"
              accept="image/*"
              multiple
              className="text-ev-muted text-sm w-full"
              onChange={(e) => setFiles(Array.from(e.target.files || []))}
            />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="ev-label">Customer price (₹)</label>
              <input
                type="number"
                min={0}
                step="1"
                className="ev-input"
                value={form.price_customer}
                onChange={(e) => setForm((f) => ({ ...f, price_customer: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="ev-label">Dealer price (₹)</label>
              <input
                type="number"
                min={0}
                step="1"
                className="ev-input"
                value={form.price_dealer}
                onChange={(e) => setForm((f) => ({ ...f, price_dealer: e.target.value }))}
                required
              />
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="ev-label">MRP / retail reference (₹, optional)</label>
              <input
                type="number"
                min={0}
                step="1"
                className="ev-input"
                value={form.mrp}
                onChange={(e) => setForm((f) => ({ ...f, mrp: e.target.value }))}
                placeholder="Leave empty to clear"
              />
            </div>
            <div>
              <label className="ev-label">Minimum order for dealers (units)</label>
              <input
                type="number"
                min={1}
                step="1"
                className="ev-input"
                value={form.min_order_quantity}
                onChange={(e) => setForm((f) => ({ ...f, min_order_quantity: e.target.value }))}
              />
            </div>
          </div>
          <div className="rounded-xl border border-ev-border bg-ev-surface2/60 p-4 text-sm text-ev-muted leading-relaxed">
            <span className="font-semibold text-ev-text">Price note:</span> Customer price and dealer price are separate fields.
            Dealers see dealer price only; MRP drives “vs retail” when set.
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="ev-label">Stock quantity</label>
              <input
                type="number"
                min={0}
                className="ev-input"
                value={form.stock}
                onChange={(e) => setForm((f) => ({ ...f, stock: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="ev-label">Low stock alert at (units)</label>
              <input
                type="number"
                min={0}
                className="ev-input"
                value={form.low_stock_threshold}
                onChange={(e) => setForm((f) => ({ ...f, low_stock_threshold: e.target.value }))}
              />
            </div>
          </div>
          <div>
            <label className="ev-label">Brand (optional)</label>
            <input className="ev-input" value={form.brand} onChange={(e) => setForm((f) => ({ ...f, brand: e.target.value }))} />
          </div>
          <div>
            <label className="ev-label">Amazon / external buy URL (optional)</label>
            <input
              type="url"
              className="ev-input"
              value={form.amazon_url}
              onChange={(e) => setForm((f) => ({ ...f, amazon_url: e.target.value }))}
              placeholder="https://www.amazon.in/…"
            />
            <p className="text-ev-subtle text-xs mt-1">Shown as “Buy from Amazon” on the public product page. Leave empty to hide.</p>
          </div>
          <label className="flex items-center gap-2 text-sm text-ev-text cursor-pointer">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))}
            />
            Active (visible in catalogue)
          </label>
          <div className="flex flex-wrap gap-3 pt-2">
            <button type="submit" className="ev-btn-primary flex items-center gap-2 px-6 py-2.5" disabled={saving}>
              {saving ? <Loader2 size={18} className="animate-spin" /> : null}
              Save changes
            </button>
            <Link href="/super/products" className="ev-btn-secondary py-2.5 px-4 text-sm">
              Cancel
            </Link>
            <button
              type="button"
              onClick={onDelete}
              className="ml-auto inline-flex items-center gap-2 text-sm text-ev-error hover:bg-ev-error/10 px-4 py-2.5 rounded-xl border border-ev-error/30"
            >
              <Trash2 size={16} />
              Delete
            </button>
          </div>
        </form>
      </main>
    </SuperadminShell>
  );
}
