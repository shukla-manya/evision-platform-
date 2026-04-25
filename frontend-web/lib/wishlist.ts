const KEY = 'ev_wishlist_ids';

export function getWishlistIds(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? parsed.map(String).filter(Boolean) : [];
  } catch {
    return [];
  }
}

export function setWishlistIds(ids: string[]) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(KEY, JSON.stringify([...new Set(ids)]));
  window.dispatchEvent(new Event('ev-wishlist'));
}

export function wishlistCount(): number {
  return getWishlistIds().length;
}

export function toggleWishlistId(productId: string): boolean {
  const ids = getWishlistIds();
  const has = ids.includes(productId);
  const next = has ? ids.filter((id) => id !== productId) : [...ids, productId];
  setWishlistIds(next);
  return !has;
}

export function isInWishlist(productId: string): boolean {
  return getWishlistIds().includes(productId);
}
