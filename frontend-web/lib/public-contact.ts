/** Customer-facing support (override in production via env). */
export const publicSupportEmail =
  process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim() || 'support@evisionindia.com';

export const publicMarketingEmail =
  process.env.NEXT_PUBLIC_MARKETING_EMAIL?.trim() || 'marketing@evisionindia.com';

/** General enquiries (shown alongside support on Contact). */
export const publicInfoEmail =
  process.env.NEXT_PUBLIC_INFO_EMAIL?.trim() || 'info@evisionindia.com';

export const publicSupportPhone =
  process.env.NEXT_PUBLIC_SUPPORT_PHONE?.trim() || '+91-9319183121';

export const publicSalesPhone =
  process.env.NEXT_PUBLIC_SALES_PHONE?.trim() || '+91-9811250806';

export const publicCompanyLegalName = 'E vision Pvt. Ltd.';

export const publicRegisteredAddress =
  'E-Vision India, 9/205, Main Market, Near PNB, Old Faridabad — 121002';

/** WGS84 — Main Market, Old Faridabad (map pin; override via env if you re-verify on Maps). */
export const publicOfficeGeoLat = Number(
  process.env.NEXT_PUBLIC_OFFICE_LAT?.trim() || '28.4132',
);
export const publicOfficeGeoLng = Number(
  process.env.NEXT_PUBLIC_OFFICE_LNG?.trim() || '77.3248',
);

/** Google Maps embed: fixed lat/lng so the pin is correct as soon as the iframe loads. */
export function publicOfficeMapEmbedUrl(): string {
  const lat = Number.isFinite(publicOfficeGeoLat) ? publicOfficeGeoLat : 28.4132;
  const lng = Number.isFinite(publicOfficeGeoLng) ? publicOfficeGeoLng : 77.3248;
  return `https://maps.google.com/maps?q=${lat},${lng}&z=17&output=embed`;
}

export function publicOfficeGoogleMapsOpenUrl(): string {
  const q = encodeURIComponent(publicRegisteredAddress);
  return `https://www.google.com/maps/search/?api=1&query=${q}`;
}

/** Normalise stored phones (e.g. +91-9811250806) to “+91 98112 50806”. */
export function formatIndianPhoneDisplay(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) {
    return `+91 ${digits.slice(2, 7)} ${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
  }
  return phone.replace(/-/g, ' ').replace(/\s+/g, ' ').trim();
}

export function publicTelHref(phone: string): string {
  const d = phone.replace(/\D/g, '');
  if (!d) return '#';
  return d.startsWith('91') ? `tel:+${d}` : `tel:+91${d}`;
}

export const publicCopyrightNotice =
  'Copyright © 2026 Evision Powered by Cybrical Tech LLP.';
