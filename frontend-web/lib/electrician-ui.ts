/** Shared copy & formatting for electrician technician app */

export const ELECTRICIAN_SUPPORT_EMAIL = 'support@lenscart.com';

export function formatCountdown(expiresAt?: string | null): string | null {
  if (!expiresAt) return null;
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (Number.isNaN(ms) || ms <= 0) return 'Expired';
  const totalMin = Math.floor(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h <= 0) return `${m}m`;
  return `${h}h ${m}m`;
}

export function formatRequestedDate(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatTimeWindow(
  preferredDate?: string | null,
  from?: string | null,
  to?: string | null,
): string {
  const datePart = preferredDate ? formatRequestedDate(preferredDate) : '';
  const fromTo =
    from && to ? `${from} – ${to}` : from ? String(from) : to ? String(to) : '';
  if (datePart && fromTo) return `${datePart} · ${fromTo}`;
  return datePart || fromTo || '—';
}

export function googleMapsDirectionsUrl(address: string): string {
  const q = encodeURIComponent(address.trim() || 'India');
  return `https://www.google.com/maps/dir/?api=1&destination=${q}`;
}

export function cleanText(v: unknown, fallback: string) {
  const s = String(v || '').trim();
  return s || fallback;
}
