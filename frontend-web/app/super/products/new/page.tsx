'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { superadminApi, catalogApi } from '@/lib/api';
import { getApiErrorMessage } from '@/lib/api-errors';
import { SuperadminShell } from '@/components/superadmin/SuperadminShell';
import { dedupeImageUrlsPreserveOrder, parseImageUrlList } from '@/lib/product-image-urls';

type Category = { id: string; name: string; parent_id?: string | null };

export default function AdminProductNewPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [saving, setSaving] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  /** Pasted http(s) image URLs, one per line or comma-separated (stored as-is on the product). */
  const [imageUrlsFromWeb, setImageUrlsFromWeb] = useState('');
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
    amazon_url: '',
    home_showcase_section: '' as '' | 'primary' | 'combos',
    home_showcase_order: '0',
    home_showcase_hot: false,
    home_showcase_rating: '',
  });

  useEffect(() => {
    catalogApi
      .getCategories()
      .then((r) => setCategories(r.data || []))
      .catch(() => toast.error('Could not load categories'));
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.category_id) {
      toast.error('Choose a category');
      return;
    }
    setSaving(true);
    try {
      const fromWeb = parseImageUrlList(imageUrlsFromWeb);
      let uploaded: string[] = [];
      if (files.length > 0) {
        const up = await superadminApi.uploadCatalogProductImages(files);
        uploaded = (up.data as { urls?: string[] })?.urls || [];
      }
      const imageUrls = dedupeImageUrlsPreserveOrder([...fromWeb, ...uploaded]);
      const body = {
        name: form.name.trim(),
        description: form.description.trim(),
        price_customer: Number(form.price_customer),
        price_dealer: Number(form.price_dealer),
        stock: Number(form.stock),
        category_id: form.category_id,
        brand: form.brand.trim() || undefined,
        active: form.active,
        low_stock_threshold: Number(form.low_stock_threshold) || 10,
        min_order_quantity: Math.max(1, Number(form.min_order_quantity) || 1),
        ...(form.mrp.trim() !== '' ? { mrp: Number(form.mrp) } : {}),
        ...(form.amazon_url.trim() !== '' ? { amazon_url: form.amazon_url.trim() } : {}),
        ...(imageUrls.length > 0 ? { images: imageUrls } : {}),
        ...(form.home_showcase_section === 'primary' || form.home_showcase_section === 'combos'
          ? {
              home_showcase_section: form.home_showcase_section,
              home_showcase_order: Number(form.home_showcase_order) || 0,
              home_showcase_hot: form.home_showcase_hot,
              ...(form.home_showcase_rating.trim() !== ''
                ? { home_showcase_rating: Number(form.home_showcase_rating) }
                : {}),
            }
          : {}),
      };
      await superadminApi.createCatalogProduct(body);
      toast.success('Product created');
      router.push('/super/products');
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Could not create product'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <SuperadminShell>
      <main className="w-full min-w-0 max-w-3xl">
        <Link href="/super/products" className="text-ev-muted text-sm inline-flex items-center gap-1 hover:text-ev-text mb-4">
          <ArrowLeft size={14} /> Products
        </Link>
        <h1 className="text-2xl font-bold text-ev-text mb-2">Add new product</h1>
        <p className="text-ev-muted text-sm mb-6">List items for your E vision catalogue.</p>
        <form onSubmit={onSubmit} className="ev-card p-6 sm:p-8 space-y-5">
          <div>
            <label className="ev-label">Product name</label>
            <input
              className="ev-input"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
              minLength={2}
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
          <div>
            <label className="ev-label">Upload images (multiple)</label>
            <input
              type="file"
              accept="image/*"
              multiple
              className="text-ev-muted text-sm w-full"
              onChange={(e) => setFiles(Array.from(e.target.files || []))}
            />
            <p className="text-ev-subtle text-xs mt-1">
              Files are stored on your catalogue CDN. You can combine uploads with online URLs below.
            </p>
          </div>
          <div>
            <label className="ev-label">Image URLs from the web (optional)</label>
            <textarea
              className="ev-input min-h-[88px] font-mono text-sm"
              value={imageUrlsFromWeb}
              onChange={(e) => setImageUrlsFromWeb(e.target.value)}
              placeholder={
                'https://cdn.example.com/product-front.jpg\nhttps://cdn.example.com/product-side.jpg'
              }
              spellCheck={false}
            />
            <p className="text-ev-subtle text-xs mt-1">
              One URL per line or comma-separated. Only http(s) links are sent. Order is kept: these URLs are listed
              before any newly uploaded files.
            </p>
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
                placeholder="For dealer “vs retail” savings"
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
            Customers only see the customer price. Dealers only see the dealer price. MRP is optional and used for “You
            save vs retail” on dealer listings when set; otherwise customer price is used as the retail reference.
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
          </div>
          <div className="rounded-xl border border-ev-border bg-ev-surface2/60 p-4 space-y-4">
            <p className="text-sm text-ev-muted leading-relaxed">
              <span className="font-semibold text-ev-text">Homepage showcase</span> — optional. Same behaviour as on the edit form.
            </p>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="ev-label">Homepage section</label>
                <select
                  className="ev-input"
                  value={form.home_showcase_section}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      home_showcase_section: e.target.value as '' | 'primary' | 'combos',
                    }))
                  }
                >
                  <option value="">Not on homepage</option>
                  <option value="primary">Advanced CCTV grid</option>
                  <option value="combos">Security Camera Collection</option>
                </select>
              </div>
              <div>
                <label className="ev-label">Sort order in section</label>
                <input
                  type="number"
                  min={0}
                  max={9999}
                  className="ev-input"
                  disabled={!form.home_showcase_section}
                  value={form.home_showcase_order}
                  onChange={(e) => setForm((f) => ({ ...f, home_showcase_order: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-4 items-end">
              <div>
                <label className="ev-label">Homepage star rating (optional)</label>
                <input
                  type="number"
                  min={1}
                  max={5}
                  step={0.05}
                  className="ev-input"
                  disabled={!form.home_showcase_section}
                  value={form.home_showcase_rating}
                  onChange={(e) => setForm((f) => ({ ...f, home_showcase_rating: e.target.value }))}
                  placeholder="1–5"
                />
              </div>
              <label className="flex items-center gap-2 text-sm text-ev-text cursor-pointer pb-2">
                <input
                  type="checkbox"
                  disabled={!form.home_showcase_section}
                  checked={form.home_showcase_hot}
                  onChange={(e) => setForm((f) => ({ ...f, home_showcase_hot: e.target.checked }))}
                />
                “Hot” on homepage
              </label>
            </div>
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
              Save product
            </button>
            <Link href="/super/products" className="ev-btn-secondary py-2.5 px-4 text-sm">
              Cancel
            </Link>
          </div>
        </form>
      </main>
    </SuperadminShell>
  );
}
