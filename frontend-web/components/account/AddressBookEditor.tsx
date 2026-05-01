'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2, MapPin, Pencil, Star, Trash2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { authApi } from '@/lib/api';

export type AddressBookEntry = {
  id?: string;
  label?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  lat?: number;
  lng?: number;
  is_default?: boolean;
};

const FALLBACK_LAT = 12.9716;
const FALLBACK_LNG = 77.5946;

function normalizeBook(raw: AddressBookEntry[]): AddressBookEntry[] {
  return raw.map((a) => ({
    id: a.id,
    label: (a.label || '').trim() || 'Home',
    address: (a.address || '').trim(),
    city: (a.city || '').trim(),
    state: (a.state || '').trim(),
    pincode: (a.pincode || '').trim().replace(/\D/g, '').slice(0, 6),
    lat: typeof a.lat === 'number' && Number.isFinite(a.lat) ? a.lat : FALLBACK_LAT,
    lng: typeof a.lng === 'number' && Number.isFinite(a.lng) ? a.lng : FALLBACK_LNG,
    is_default: Boolean(a.is_default),
  }));
}

function ensureOneDefault(book: AddressBookEntry[]): AddressBookEntry[] {
  if (book.length === 0) return [];
  const def = book.findIndex((x) => x.is_default);
  if (def < 0) return book.map((x, i) => ({ ...x, is_default: i === 0 }));
  return book.map((x, i) => ({ ...x, is_default: i === def }));
}

function validateRow(a: AddressBookEntry): string | null {
  if (a.address.trim().length < 3) return 'Enter street address (at least 3 characters)';
  if (a.city.trim().length < 2) return 'Enter city';
  if (a.state.trim().length < 2) return 'Enter state';
  if (!/^\d{6}$/.test(a.pincode.trim())) return 'Enter a valid 6-digit pincode';
  return null;
}

function rowKey(a: AddressBookEntry, i: number) {
  return a.id || `row-${i}`;
}

type Props = {
  variant: 'checkout' | 'profile';
  addresses: AddressBookEntry[];
  selectedIdx?: number;
  onSelectedIdxChange?: (idx: number) => void;
  /** Called after a successful save with the server-normalized address book */
  onSaved: (book: AddressBookEntry[]) => void;
};

export function AddressBookEditor({
  variant,
  addresses,
  selectedIdx = 0,
  onSelectedIdxChange,
  onSaved,
}: Props) {
  const [book, setBook] = useState<AddressBookEntry[]>(() => ensureOneDefault(normalizeBook(addresses)));
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const snapshotRef = useRef<AddressBookEntry[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [newRow, setNewRow] = useState({ label: 'Home', address: '', city: '', state: '', pincode: '' });

  const syncKey = addresses.map((a) => [a.id, a.address, a.city, a.pincode, a.is_default].join('|')).join('~');
  useEffect(() => {
    setBook(ensureOneDefault(normalizeBook(addresses)));
    setEditingIdx(null);
    snapshotRef.current = null;
  }, [syncKey]);

  const persist = useCallback(
    async (next: AddressBookEntry[]): Promise<AddressBookEntry[] | null> => {
      const payload = ensureOneDefault(normalizeBook(next));
      setSaving(true);
      try {
        const { data } = await authApi.replaceAddressBook(payload as Record<string, unknown>[]);
        const raw = (data as { address_book?: AddressBookEntry[] })?.address_book;
        const normalized = ensureOneDefault(normalizeBook(raw && raw.length ? raw : payload));
        setBook(normalized);
        onSaved(normalized);
        toast.success('Addresses saved');
        setEditingIdx(null);
        snapshotRef.current = null;
        return normalized;
      } catch {
        toast.error('Could not save addresses');
        return null;
      } finally {
        setSaving(false);
      }
    },
    [onSaved],
  );

  function beginEdit(i: number) {
    snapshotRef.current = book.map((x) => ({ ...x }));
    setEditingIdx(i);
  }

  function cancelEdit() {
    if (snapshotRef.current) setBook(ensureOneDefault(normalizeBook(snapshotRef.current)));
    setEditingIdx(null);
    snapshotRef.current = null;
  }

  function patchRow(i: number, patch: Partial<AddressBookEntry>) {
    setBook((prev) => {
      const next = [...prev];
      next[i] = { ...next[i], ...patch };
      return next;
    });
  }

  function saveRow(i: number) {
    const row = book[i];
    if (!row) return;
    const err = validateRow(row);
    if (err) {
      toast.error(err);
      return;
    }
    const normalizedRow = normalizeBook([row])[0];
    const next = book.map((x, j) => (j === i ? normalizedRow : x));
    void persist(next);
  }

  async function setDefault(i: number) {
    const next = book.map((x, j) => ({ ...x, is_default: j === i }));
    const saved = await persist(next);
    if (saved) onSelectedIdxChange?.(i);
  }

  async function removeAt(i: number) {
    const next = book.filter((_, j) => j !== i);
    const nextNorm = ensureOneDefault(normalizeBook(next));
    const saved = await persist(nextNorm);
    if (!saved || !onSelectedIdxChange) return;
    if (saved.length === 0) {
      onSelectedIdxChange(0);
      return;
    }
    let nextSel = selectedIdx;
    if (i === nextSel) nextSel = 0;
    else if (i < nextSel) nextSel = nextSel - 1;
    onSelectedIdxChange(Math.min(Math.max(0, nextSel), saved.length - 1));
  }

  async function addNew() {
    const row: AddressBookEntry = {
      label: newRow.label.trim() || 'Home',
      address: newRow.address.trim(),
      city: newRow.city.trim(),
      state: newRow.state.trim(),
      pincode: newRow.pincode.trim().replace(/\D/g, '').slice(0, 6),
      lat: FALLBACK_LAT,
      lng: FALLBACK_LNG,
      is_default: book.length === 0,
    };
    const err = validateRow(row);
    if (err) {
      toast.error(err);
      return;
    }
    const next = ensureOneDefault(normalizeBook([...book, row]));
    const saved = await persist(next);
    setNewRow({ label: 'Home', address: '', city: '', state: '', pincode: '' });
    if (saved && variant === 'checkout' && onSelectedIdxChange) {
      onSelectedIdxChange(saved.length - 1);
    }
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-ev-text flex items-center gap-2">
        <MapPin size={18} className="text-ev-primary" />
        {variant === 'checkout' ? 'Delivery addresses' : 'Saved addresses'}
      </h2>

      {book.length === 0 ? (
        <p className="text-ev-muted text-sm">No saved addresses yet. Add one below.</p>
      ) : (
        <ul className="space-y-3">
          {book.map((a, i) => {
            const key = rowKey(a, i);
            const isEditing = editingIdx === i;
            return (
              <li key={key} className="rounded-xl border border-ev-border bg-ev-surface2/40 p-4 space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  {variant === 'checkout' ? (
                    <label className="flex items-start gap-2 cursor-pointer min-w-0 flex-1">
                      <input
                        type="radio"
                        name="addr-book"
                        checked={selectedIdx === i}
                        disabled={isEditing}
                        onChange={() => onSelectedIdxChange?.(i)}
                        className="mt-1.5 shrink-0"
                      />
                      <span className="font-semibold text-ev-text">{a.label || 'Address'}</span>
                    </label>
                  ) : (
                    <span className="font-semibold text-ev-text">{a.label || 'Address'}</span>
                  )}
                  <div className="flex flex-wrap items-center gap-1 shrink-0">
                    {a.is_default ? (
                      <span className="text-xs font-medium text-ev-primary">Default</span>
                    ) : (
                      <button
                        type="button"
                        disabled={saving || isEditing}
                        onClick={() => void setDefault(i)}
                        className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-ev-muted hover:bg-ev-surface hover:text-ev-text disabled:opacity-50"
                      >
                        <Star size={14} />
                        Set default
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={saving || isEditing}
                      onClick={() => beginEdit(i)}
                      className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-ev-muted hover:bg-ev-surface hover:text-ev-text disabled:opacity-50"
                    >
                      <Pencil size={14} />
                      Edit
                    </button>
                    <button
                      type="button"
                      disabled={saving || isEditing}
                      onClick={() => void removeAt(i)}
                      className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-ev-error/90 hover:bg-ev-error/10 disabled:opacity-50"
                    >
                      <Trash2 size={14} />
                      Remove
                    </button>
                  </div>
                </div>

                {isEditing ? (
                  <div className="space-y-3 border-t border-ev-border pt-3">
                    <div className="grid sm:grid-cols-2 gap-3">
                      <input
                        className="ev-input"
                        placeholder="Label (e.g. Home)"
                        value={a.label}
                        onChange={(e) => patchRow(i, { label: e.target.value })}
                      />
                      <input
                        className="ev-input"
                        placeholder="Pincode"
                        value={a.pincode}
                        onChange={(e) =>
                          patchRow(i, { pincode: e.target.value.replace(/\D/g, '').slice(0, 6) })
                        }
                      />
                    </div>
                    <input
                      className="ev-input"
                      placeholder="Street address"
                      value={a.address}
                      onChange={(e) => patchRow(i, { address: e.target.value })}
                    />
                    <div className="grid sm:grid-cols-2 gap-3">
                      <input
                        className="ev-input"
                        placeholder="City"
                        value={a.city}
                        onChange={(e) => patchRow(i, { city: e.target.value })}
                      />
                      <input
                        className="ev-input"
                        placeholder="State"
                        value={a.state}
                        onChange={(e) => patchRow(i, { state: e.target.value })}
                      />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => void saveRow(i)}
                        className="ev-btn-primary text-sm py-2 px-4 inline-flex items-center gap-2"
                      >
                        {saving ? <Loader2 size={14} className="animate-spin" /> : null}
                        Save changes
                      </button>
                      <button
                        type="button"
                        disabled={saving}
                        onClick={cancelEdit}
                        className="ev-btn-secondary text-sm py-2 px-4 inline-flex items-center gap-2"
                      >
                        <X size={14} />
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-ev-muted pl-0 sm:pl-7">
                    {a.address}, {a.city}, {a.state} {a.pincode}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <div className="border-t border-ev-border pt-4 space-y-3">
        <p className="text-sm font-medium text-ev-text">Add new address</p>
        <div className="grid sm:grid-cols-2 gap-3">
          <input
            className="ev-input"
            placeholder="Label (e.g. Office)"
            value={newRow.label}
            onChange={(e) => setNewRow((x) => ({ ...x, label: e.target.value }))}
          />
          <input
            className="ev-input"
            placeholder="Pincode"
            value={newRow.pincode}
            onChange={(e) => setNewRow((x) => ({ ...x, pincode: e.target.value.replace(/\D/g, '').slice(0, 6) }))}
          />
        </div>
        <input
          className="ev-input"
          placeholder="Street address"
          value={newRow.address}
          onChange={(e) => setNewRow((x) => ({ ...x, address: e.target.value }))}
        />
        <div className="grid sm:grid-cols-2 gap-3">
          <input
            className="ev-input"
            placeholder="City"
            value={newRow.city}
            onChange={(e) => setNewRow((x) => ({ ...x, city: e.target.value }))}
          />
          <input
            className="ev-input"
            placeholder="State"
            value={newRow.state}
            onChange={(e) => setNewRow((x) => ({ ...x, state: e.target.value }))}
          />
        </div>
        <button
          type="button"
          disabled={saving}
          onClick={() => void addNew()}
          className="ev-btn-secondary text-sm py-2 px-4 inline-flex items-center gap-2"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : null}
          Save new address
        </button>
      </div>
    </div>
  );
}
