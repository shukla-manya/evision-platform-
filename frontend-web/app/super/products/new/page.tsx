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
    active: true,
    low_stock_threshold: '10',
    mrp: '',
    min_order_quantity: '1',
    amazon_url: '',
    hsn_code: '',
    store_sku: '',
    home_showcase_section: '' as '' | 'primary' | 'combos',
    home_showcase_order: '0',
    home_showcase_hot: false,
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
    const hsnTrim = form.hsn_code.trim();
    if (hsnTrim && !/^\d{4,10}$/.test(hsnTrim)) {
      toast.error('HSN/SAC must be 4–10 digits only');
      return;
    }
    const skuTrim = form.store_sku.trim();
    if (skuTrim.length > 120) {
      toast.error('Store SKU must be at most 120 characters');
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
        active: form.active,
        low_stock_threshold: Number(form.low_stock_threshold) || 10,
        min_order_quantity: Math.max(1, Number(form.min_order_quantity) || 1),
        ...(form.mrp.trim() !== '' ? { mrp: Number(form.mrp) } : {}),
        ...(form.amazon_url.trim() !== '' ? { amazon_url: form.amazon_url.trim() } : {}),
        ...(hsnTrim ? { hsn_code: hsnTrim } : {}),
        ...(skuTrim ? { store_sku: skuTrim } : {}),
        ...(imageUrls.length > 0 ? { images: imageUrls } : {}),
        ...(form.home_showcase_section === 'primary' || form.home_showcase_section === 'combos'
          ? {
              home_showcase_section: form.home_showcase_section,
              home_showcase_order: Number(form.home_showcase_order) || 0,
              home_showcase_hot: form.home_showcase_hot,
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
      <main className="w-full min-w-0 pb-6">
        <Link
          href="/super/products"
          className="text-ev-muted text-sm inline-flex min-w-0 max-w-full items-center gap-1 hover:text-ev-text mb-3 sm:mb-4"
        >
          <ArrowLeft size={14} className="shrink-0" /> Products
        </Link>
        <h1 className="text-xl font-bold text-ev-text sm:text-2xl mb-1.5 sm:mb-2 pr-1 break-words">
          Add new product
        </h1>
        <p className="text-ev-muted text-sm mb-5 sm:mb-6 max-w-prose break-words">
          List items for your E vision catalogue.
        </p>
        <form onSubmit={onSubmit} className="ev-card min-w-0 space-y-4 p-4 sm:space-y-5 sm:p-6 md:p-8">
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
              className="ev-input min-h-[160px] font-mono text-sm leading-relaxed"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder={
                'One point per line. Use "- " at the start of a line for bullets on the storefront, e.g.\n- 1080p video\n- 15m night vision\n- App control'
              }
              spellCheck
              required
            />
            <p className="text-ev-subtle mt-1.5 text-xs leading-relaxed">
              On the public product page, each line becomes a point; lines starting with <span className="font-mono">- </span>,{' '}
              <span className="font-mono">* </span>, <span className="font-mono">• </span>, or <span className="font-mono">1. </span>
              are shown as a proper bullet list.
            </p>
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
            <p className="text-ev-subtle mt-1.5 text-xs leading-relaxed">
              This is the catalogue “type” shoppers use on the Shop page: the left sidebar lists these same categories, and
              picking one filters products to that group. Choose the closest match so your listing appears in the right place.
            </p>
          </div>
          <div className="min-w-0">
            <label className="ev-label">Upload images (multiple)</label>
            <input
              type="file"
              accept="image/*"
              multiple
              className="text-ev-muted max-w-full min-w-0 text-sm file:mr-2 file:rounded-lg file:border file:border-ev-border file:bg-ev-surface2 file:px-3 file:py-2 file:text-sm file:font-medium file:text-ev-text"
              onChange={(e) => setFiles(Array.from(e.target.files || []))}
            />
            <p className="text-ev-subtle mt-1 text-xs leading-relaxed break-words">
              Files are stored on your catalogue CDN. You can combine uploads with online URLs below.
            </p>
          </div>
          <div className="min-w-0">
            <label className="ev-label">Image URLs from the web (optional)</label>
            <textarea
              className="ev-input min-h-[88px] min-w-0 font-mono text-sm break-all sm:break-words"
              value={imageUrlsFromWeb}
              onChange={(e) => setImageUrlsFromWeb(e.target.value)}
              placeholder={
                'https://cdn.example.com/product-front.jpg\nhttps://cdn.example.com/product-side.jpg'
              }
              spellCheck={false}
            />
            <p className="text-ev-subtle mt-1 text-xs leading-relaxed break-words">
              One URL per line or comma-separated. Only http(s) links are sent. Order is kept: these URLs are listed
              before any newly uploaded files.
            </p>
          </div>
          <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
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
          <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
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
          <div className="rounded-xl border border-ev-border bg-ev-surface2/60 p-3 text-sm leading-relaxed text-ev-muted sm:p-4 break-words">
            <span className="font-semibold text-ev-text">Price note:</span> Customer price and dealer price are separate fields.
            Customers only see the customer price. Dealers only see the dealer price. MRP is optional and used for “You
            save vs retail” on dealer listings when set; otherwise customer price is used as the retail reference.
          </div>
          <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
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
            <label className="ev-label">Amazon / external buy URL (optional)</label>
            <input
              type="url"
              className="ev-input"
              value={form.amazon_url}
              onChange={(e) => setForm((f) => ({ ...f, amazon_url: e.target.value }))}
              placeholder="https://www.amazon.in/…"
            />
          </div>
          <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="ev-label">HSN / SAC (optional)</label>
              <input
                className="ev-input font-mono"
                inputMode="numeric"
                maxLength={10}
                value={form.hsn_code}
                onChange={(e) => setForm((f) => ({ ...f, hsn_code: e.target.value.replace(/\D/g, '').slice(0, 10) }))}
                placeholder="e.g. 85176290"
              />
              <p className="text-ev-subtle mt-1.5 text-xs leading-relaxed">
                4–10 digits. Printed on GST tax invoices for this SKU.
              </p>
            </div>
            <div>
              <label className="ev-label">Store SKU (optional)</label>
              <input
                className="ev-input font-mono"
                maxLength={120}
                value={form.store_sku}
                onChange={(e) => setForm((f) => ({ ...f, store_sku: e.target.value }))}
                placeholder="Manufacturer or internal code"
              />
              <p className="text-ev-subtle mt-1.5 text-xs leading-relaxed">Shown on order and dealer invoice line items.</p>
            </div>
          </div>
          <div className="min-w-0 space-y-4 rounded-xl border border-ev-border bg-ev-surface2/60 p-3 sm:p-4">
            <p className="text-sm leading-relaxed text-ev-muted break-words">
              <span className="font-semibold text-ev-text">Homepage showcase</span> — optional. Same behaviour as on the edit form.
            </p>
            <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
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
            <div className="grid min-w-0 grid-cols-1 items-end gap-4 sm:grid-cols-2">
              <p className="text-ev-subtle text-xs sm:col-span-2">
                Star ratings on the homepage and product pages come from verified customer reviews, not a manual number.
              </p>
              <label className="flex cursor-pointer items-center gap-2 pb-0 text-sm text-ev-text sm:pb-2 min-h-[44px] sm:min-h-0">
                <input
                  type="checkbox"
                  disabled={!form.home_showcase_section}
                  checked={form.home_showcase_hot}
                  onChange={(e) => setForm((f) => ({ ...f, home_showcase_hot: e.target.checked }))}
                  className="h-4 w-4 shrink-0 rounded border-ev-border"
                />
                <span className="min-w-0 leading-snug">“Hot” on homepage</span>
              </label>
            </div>
          </div>
          <label className="flex min-w-0 cursor-pointer items-start gap-2.5 text-sm text-ev-text sm:items-center">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))}
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-ev-border sm:mt-0"
            />
            <span className="min-w-0 leading-snug">Active (visible in catalogue)</span>
          </label>
          <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:flex-wrap">
            <button
              type="submit"
              className="ev-btn-primary flex w-full min-h-11 items-center justify-center gap-2 px-6 py-2.5 sm:w-auto sm:min-h-0"
              disabled={saving}
            >
              {saving ? <Loader2 size={18} className="animate-spin" /> : null}
              Save product
            </button>
            <Link
              href="/super/products"
              className="ev-btn-secondary inline-flex w-full min-h-11 items-center justify-center py-2.5 px-4 text-center text-sm sm:w-auto sm:min-h-0"
            >
              Cancel
            </Link>
          </div>
        </form>
      </main>
    </SuperadminShell>
  );
}
