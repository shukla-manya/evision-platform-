const KEY = 'ev_browse_product_ids';
const MAX = 40;

export function recordProductBrowse(productId: string) {
  if (typeof window === 'undefined' || !productId) return;
  try {
    const raw = window.localStorage.getItem(KEY) || '[]';
    const parsed: unknown = JSON.parse(raw);
    const prev = Array.isArray(parsed) ? (parsed as string[]) : [];
    const next = [productId, ...prev.filter((x) => x !== productId)].slice(0, MAX);
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
}

export function getBrowseProductIds(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(KEY) || '[]';
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as string[]).filter(Boolean) : [];
  } catch {
    return [];
  }
}
