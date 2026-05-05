'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { superadminApi, catalogApi } from '@/lib/api';
import { getApiErrorMessage } from '@/lib/api-errors';
import { SuperadminShell } from '@/components/superadmin/SuperadminShell';
import { dedupeImageUrlsPreserveOrder, parseImageUrlList } from '@/lib/product-image-urls';

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
  home_showcase_section?: 'primary' | 'combos' | string;
  home_showcase_order?: number;
  home_showcase_hot?: boolean;
  hsn_code?: string | null;
  store_sku?: string | null;
};

export default function AdminProductEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  /** Appended on save; parsed with `parseImageUrlList` */
  const [additionalImageUrls, setAdditionalImageUrls] = useState('');
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
          hsn_code: typeof p.hsn_code === 'string' ? p.hsn_code : '',
          store_sku: typeof p.store_sku === 'string' ? p.store_sku : '',
          home_showcase_section:
            p.home_showcase_section === 'primary' || p.home_showcase_section === 'combos'
              ? p.home_showcase_section
              : '',
          home_showcase_order: String(Number(p.home_showcase_order ?? 0)),
          home_showcase_hot: p.home_showcase_hot === true,
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
      const pasted = parseImageUrlList(additionalImageUrls);
      let nextImages = dedupeImageUrlsPreserveOrder([...form.images, ...pasted]);
      if (files.length > 0) {
        const up = await superadminApi.uploadCatalogProductImages(files);
        const urls = (up.data as { urls?: string[] })?.urls || [];
        nextImages = dedupeImageUrlsPreserveOrder([...nextImages, ...urls]);
      }
      const showcase: Record<string, unknown> = {};
      if (form.home_showcase_section === '') {
        showcase.home_showcase_section = '';
      } else {
        showcase.home_showcase_section = form.home_showcase_section;
        showcase.home_showcase_order = Number(form.home_showcase_order) || 0;
        showcase.home_showcase_hot = form.home_showcase_hot;
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
        hsn_code: hsnTrim === '' ? null : hsnTrim,
        store_sku: skuTrim === '' ? null : skuTrim,
        ...showcase,
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
      <main className="w-full min-w-0 pb-6">
        <Link
          href="/super/products"
          className="ev-btn-secondary mb-4 inline-flex w-full min-h-11 shrink-0 items-center justify-center gap-2 py-2.5 text-sm sm:mb-5 sm:w-auto sm:min-h-0 sm:justify-start sm:px-4"
        >
          <ArrowLeft size={16} className="shrink-0" aria-hidden />
          Products
        </Link>
        <h1 className="mb-1.5 pr-1 text-xl font-bold text-ev-text break-words sm:mb-2 sm:text-2xl">Edit product</h1>
        <p className="mb-5 max-w-prose break-words text-sm text-ev-muted sm:mb-6">Update catalogue details and pricing.</p>
        <form onSubmit={onSubmit} className="ev-card min-w-0 space-y-4 p-4 sm:space-y-5 sm:p-6 md:p-8">
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
              className="ev-input min-h-[160px] font-mono text-sm leading-relaxed"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder={
                'One point per line. Use "- " for bullets, e.g.\n- Key benefit one\n- Key benefit two'
              }
              spellCheck
              required
            />
            <p className="text-ev-subtle mt-1.5 text-xs leading-relaxed">
              Storefront shows each line as a point; lines starting with <span className="font-mono">- </span>,{' '}
              <span className="font-mono">* </span>, <span className="font-mono">• </span>, or numbered{' '}
              <span className="font-mono">1. </span>
              render as a bullet list.
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
              Shop filters use this field: customers narrow the catalogue from the left sidebar by category (same names as
              here). Subcategories show as indented (↳) in both places.
            </p>
          </div>
          <div>
            <p className="ev-label">Product images</p>
            {form.images.length > 0 ? (
              <ul className="space-y-2 mb-3">
                {form.images.map((u, idx) => (
                  <li
                    key={`${u}-${idx}`}
                    className="flex gap-3 items-start rounded-xl border border-ev-border bg-ev-surface2 p-2"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={u}
                      alt=""
                      className="w-14 h-14 shrink-0 rounded-lg object-cover bg-ev-surface border border-ev-border"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-mono text-ev-muted break-all">{u}</p>
                      <button
                        type="button"
                        className="text-xs text-ev-error hover:underline mt-1"
                        onClick={() =>
                          setForm((f) => ({
                            ...f,
                            images: f.images.filter((_, i) => i !== idx),
                          }))
                        }
                      >
                        Remove from product
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-ev-muted mb-2">No images yet. Add URLs or upload files below.</p>
            )}
            <label className="ev-label text-sm">Add image URLs from the web</label>
            <textarea
              className="ev-input min-h-[80px] font-mono text-sm mt-1"
              value={additionalImageUrls}
              onChange={(e) => setAdditionalImageUrls(e.target.value)}
              placeholder="https://… one per line or comma-separated"
              spellCheck={false}
            />
            <p className="text-ev-subtle text-xs mt-1">
              Parsed on save (http/https only). Existing images stay unless you remove them above.
            </p>
          </div>
          <div>
            <label className="ev-label">Upload more images (multiple)</label>
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
          <div className="rounded-xl border border-ev-border bg-ev-surface2/60 p-4 space-y-4">
            <p className="text-sm text-ev-muted leading-relaxed">
              <span className="font-semibold text-ev-text">Homepage showcase</span> — pick where this SKU appears on the public home page
              (Advanced CCTV grid vs Security Camera Collection). Leave “Not on homepage” to remove. Sort order is ascending (0 first).
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
                  step={1}
                  className="ev-input"
                  disabled={!form.home_showcase_section}
                  value={form.home_showcase_order}
                  onChange={(e) => setForm((f) => ({ ...f, home_showcase_order: e.target.value }))}
                />
              </div>
            </div>
            <p className="text-ev-subtle text-xs">
              Homepage stars use the average of real customer product reviews (same as the public product page), not a manual score.
            </p>
            <label className="flex items-center gap-2 text-sm text-ev-text cursor-pointer">
              <input
                type="checkbox"
                disabled={!form.home_showcase_section}
                checked={form.home_showcase_hot}
                onChange={(e) => setForm((f) => ({ ...f, home_showcase_hot: e.target.checked }))}
              />
              Show “Hot” ribbon on homepage card
            </label>
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
          <div className="grid sm:grid-cols-2 gap-4">
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
              <p className="text-ev-subtle text-xs mt-1">4–10 digits for GST invoices. Clear the field to remove.</p>
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
              <p className="text-ev-subtle text-xs mt-1">Printed on order line items. Clear to remove.</p>
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
          <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:flex-wrap sm:items-center">
            <button
              type="button"
              onClick={onDelete}
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-ev-error/30 px-4 py-2.5 text-sm text-ev-error hover:bg-ev-error/10 sm:order-last sm:ml-auto sm:min-h-0 sm:w-auto"
            >
              <Trash2 size={16} aria-hidden />
              Delete
            </button>
            <div className="flex flex-col gap-3 sm:flex-1 sm:flex-row sm:flex-wrap sm:gap-3">
              <button
                type="submit"
                className="ev-btn-primary flex min-h-11 w-full items-center justify-center gap-2 px-6 py-2.5 sm:min-h-0 sm:w-auto"
                disabled={saving}
              >
                {saving ? <Loader2 size={18} className="animate-spin" aria-hidden /> : null}
                Save changes
              </button>
              <Link
                href="/super/products"
                className="ev-btn-secondary flex min-h-11 w-full items-center justify-center py-2.5 text-center text-sm sm:min-h-0 sm:w-auto sm:px-4"
              >
                Cancel
              </Link>
            </div>
          </div>
        </form>
      </main>
    </SuperadminShell>
  );
}
