/**
 * Origin of the Next.js storefront (FAQ, privacy, etc.). Prefer EXPO_PUBLIC_WEB_ORIGIN when
 * the API and website run on different hosts; otherwise we derive from EXPO_PUBLIC_SHOP_REGISTER_URL.
 */
export function getPublicWebOrigin(): string {
  const explicit = process.env.EXPO_PUBLIC_WEB_ORIGIN?.trim();
  if (explicit) return explicit.replace(/\/+$/, '');
  const shopReg = process.env.EXPO_PUBLIC_SHOP_REGISTER_URL?.trim();
  if (shopReg) {
    try {
      return new URL(shopReg).origin;
    } catch {
      /* ignore */
    }
  }
  return 'http://localhost:3000';
}

export function publicWebUrl(path: string): string {
  const origin = getPublicWebOrigin();
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${origin}${p}`;
}
