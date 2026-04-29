'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { catalogApi, superadminApi } from '@/lib/api';
import { getApiErrorMessage } from '@/lib/api-errors';
import { SuperadminShell } from '@/components/superadmin/SuperadminShell';

type Category = { id: string; name: string; parent_id?: string | null };

export default function SuperCategoriesPage() {
  const [items, setItems] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [parentId, setParentId] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    catalogApi
      .getCategories()
      .then((r) => setItems(Array.isArray(r.data) ? (r.data as Category[]) : []))
      .catch(() => toast.error('Failed to load categories'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    const n = name.trim();
    if (n.length < 2) {
      toast.error('Name must be at least 2 characters');
      return;
    }
    setSaving(true);
    try {
      await superadminApi.createCategory({
        name: n,
        ...(parentId ? { parent_id: parentId } : {}),
      });
      toast.success('Category created');
      setName('');
      setParentId('');
      load();
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Could not create category'));
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(id: string, label: string) {
    if (!window.confirm(`Delete category “${label}”? Products referencing it may break.`)) return;
    setDeleting(id);
    try {
      await superadminApi.deleteCategory(id);
      toast.success('Deleted');
      load();
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Delete failed'));
    } finally {
      setDeleting(null);
    }
  }

  return (
    <SuperadminShell>
      <main className="w-full min-w-0 max-w-3xl">
        <h1 className="text-2xl font-bold text-ev-text mb-2">Categories</h1>
        <p className="text-ev-muted text-sm mb-6">Used by the public shop and catalogue (customer / dealer pricing is on products).</p>

        <form onSubmit={onCreate} className="ev-card p-5 sm:p-6 space-y-4 mb-8">
          <h2 className="text-sm font-semibold text-ev-text">Add category</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="ev-label">Name</label>
              <input className="ev-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. CCTV Cameras" />
            </div>
            <div>
              <label className="ev-label">Parent (optional)</label>
              <select className="ev-input" value={parentId} onChange={(e) => setParentId(e.target.value)}>
                <option value="">— Top level —</option>
                {items
                  .filter((c) => !c.parent_id)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
              </select>
            </div>
          </div>
          <button type="submit" className="ev-btn-primary text-sm py-2 px-4 inline-flex items-center gap-2" disabled={saving}>
            {saving ? <Loader2 className="animate-spin" size={16} /> : <Plus size={16} />}
            Create
          </button>
        </form>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-ev-muted gap-2">
            <Loader2 className="animate-spin text-ev-primary" size={22} /> Loading…
          </div>
        ) : (
          <ul className="divide-y divide-ev-border rounded-xl border border-ev-border bg-ev-surface overflow-hidden">
            {items.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                <span className="text-ev-text">
                  {c.parent_id ? <span className="text-ev-muted">↳ </span> : null}
                  {c.name}
                </span>
                <button
                  type="button"
                  disabled={deleting === c.id}
                  onClick={() => void onDelete(c.id, c.name)}
                  className="text-red-600 text-xs font-semibold inline-flex items-center gap-1 hover:underline disabled:opacity-40"
                >
                  <Trash2 size={12} /> {deleting === c.id ? '…' : 'Delete'}
                </button>
              </li>
            ))}
          </ul>
        )}
      </main>
    </SuperadminShell>
  );
}
