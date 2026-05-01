/** Customer-facing lines (align with web `lib/public-contact` defaults). */
export const publicSupportPhoneDisplay =
  process.env.EXPO_PUBLIC_SUPPORT_PHONE?.trim() || '+91-9319183121';

export const publicSalesPhoneDisplay =
  process.env.EXPO_PUBLIC_SALES_PHONE?.trim() || '+91-9811250806';

export const publicMarketingEmail =
  process.env.EXPO_PUBLIC_MARKETING_EMAIL?.trim() || 'marketing@evisionindia.com';

export const publicSupportEmail =
  process.env.EXPO_PUBLIC_SUPPORT_EMAIL?.trim() || 'support@evisionindia.com';

export const publicInfoEmail =
  process.env.EXPO_PUBLIC_INFO_EMAIL?.trim() || 'info@evisionindia.com';

export const publicRegisteredAddress =
  'E-Vision India, 9/205, Main Market, Near PNB, Old Faridabad — 121002';

/** Marketing display name (matches web `NEXT_PUBLIC_BRAND_NAME` / `lib/public-brand`). */
export const publicBrandName = process.env.EXPO_PUBLIC_BRAND_NAME?.trim() || 'E vision';

/** Lettermark above the in-app catalogue (matches web `NEXT_PUBLIC_SHOP_BRAND_MARK`). */
export const publicShopBrandMark =
  process.env.EXPO_PUBLIC_SHOP_BRAND_MARK?.trim() || 'EVISION';

export function publicSupportTelHref(): string {
  const d = publicSupportPhoneDisplay.replace(/\D/g, '');
  if (d.length >= 10) return `tel:+${d.replace(/^\+?/, '')}`;
  return 'tel:+919319183121';
}

export function publicSalesTelHref(): string {
  const d = publicSalesPhoneDisplay.replace(/\D/g, '');
  if (d.length >= 10) return `tel:+${d.replace(/^\+?/, '')}`;
  return 'tel:+919811250806';
}

/** Match web `formatIndianPhoneDisplay` in `frontend-web/lib/public-contact.ts`. */
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

/** WhatsApp chat (`wa.me`) — same rules as web `publicWhatsAppChatUrl`. */
export function publicWhatsAppChatUrl(phone: string = publicSupportPhoneDisplay): string {
  const d = phone.replace(/\D/g, '');
  if (!d) return 'https://wa.me/';
  const wa = d.length === 10 ? `91${d}` : d.startsWith('91') ? d : `91${d}`;
  return `https://wa.me/${wa}`;
}

export const publicMarketingHomeTagline =
  'CCTV, PoE networking, and smart security — browse approved stores, pay with PayU, and track orders in one place.';
