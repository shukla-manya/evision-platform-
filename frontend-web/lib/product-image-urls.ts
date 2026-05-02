/**
 * Parse pasted image URLs (newline or comma separated). Only http(s) kept; order preserved; duplicates removed.
 */
export function parseImageUrlList(raw: string): string[] {
  const parts = raw
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const out: string[] = [];
  const seen = new Set<string>();
  for (const p of parts) {
    try {
      const u = new URL(p);
      if (u.protocol !== 'http:' && u.protocol !== 'https:') continue;
      const href = u.href;
      if (seen.has(href)) continue;
      seen.add(href);
      out.push(href);
    } catch {
      /* skip invalid */
    }
  }
  return out;
}

export function dedupeImageUrlsPreserveOrder(urls: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const u of urls) {
    const t = u.trim();
    if (!t || seen.has(t)) continue;
    seen.add(t);
    out.push(t);
  }
  return out;
}
