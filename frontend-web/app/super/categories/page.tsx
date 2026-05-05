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
      await superadminApi.createCategory({ name: n });
      toast.success('Category created');
      setName('');
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
      <main className="w-full min-w-0 overflow-x-hidden">
        <h1 className="text-xl font-bold text-ev-text sm:text-2xl mb-2">Categories</h1>
        <p className="text-ev-muted text-sm mb-6 max-w-prose">
          Used by the public shop and catalogue (customer / dealer pricing is on products).
        </p>

        <form onSubmit={onCreate} className="ev-card p-4 sm:p-6 space-y-4 mb-8">
          <h2 className="text-sm font-semibold text-ev-text">Add category</h2>
          <div className="min-w-0">
            <label className="ev-label">Name</label>
            <input
              className="ev-input w-full min-w-0"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. CCTV Cameras"
            />
          </div>
          <button
            type="submit"
            className="ev-btn-primary w-full text-sm py-2.5 px-4 sm:w-auto inline-flex items-center justify-center gap-2"
            disabled={saving}
          >
            {saving ? <Loader2 className="animate-spin" size={16} /> : <Plus size={16} />}
            Create
          </button>
        </form>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-ev-muted gap-2">
            <Loader2 className="animate-spin text-ev-primary" size={22} /> Loading…
          </div>
        ) : items.length === 0 ? (
          <div className="ev-card p-8 sm:p-10 text-center text-ev-muted text-sm">No categories yet. Add one above.</div>
        ) : (
          <ul className="divide-y divide-ev-border rounded-xl border border-ev-border bg-ev-surface overflow-hidden">
            {items.map((c) => (
              <li
                key={c.id}
                className="flex flex-col gap-2 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between sm:gap-3"
              >
                <span className="min-w-0 break-words text-ev-text sm:pr-2">
                  {c.parent_id ? <span className="text-ev-muted">↳ </span> : null}
                  {c.name}
                </span>
                <button
                  type="button"
                  disabled={deleting === c.id}
                  onClick={() => void onDelete(c.id, c.name)}
                  className="shrink-0 self-end text-red-600 text-xs font-semibold inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 min-h-10 min-w-[5.5rem] hover:bg-red-500/10 hover:underline disabled:opacity-40 sm:self-auto sm:min-h-0 sm:min-w-0 sm:px-2 sm:py-1.5"
                >
                  <Trash2 size={12} aria-hidden /> {deleting === c.id ? '…' : 'Delete'}
                </button>
              </li>
            ))}
          </ul>
        )}
      </main>
    </SuperadminShell>
  );
}
