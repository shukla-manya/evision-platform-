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
  'E-Vision India, 9/205, Main Market, Near PNB, Old Faridabad-121002';

export const publicCopyrightNotice =
  'Copyright © 2026 Evision Powered by Cybrical Tech LLP.';

/** Lettermark above the in-app catalogue (matches web `NEXT_PUBLIC_SHOP_BRAND_MARK`). */
export const publicShopBrandMark =
  process.env.EXPO_PUBLIC_SHOP_BRAND_MARK?.trim() || 'EVISION';

/** Short brand blurb (matches web `aboutBrandSummary`). */
export const aboutBrandSummary =
  'EVISION is a surveillance solutions brand delivering high-performance CCTV systems and advanced network infrastructure, including PoE and AI-based technologies for reliable security across homes, businesses, and large-scale projects.';

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

export const publicMarketingHomeTagline =
  'CCTV, PoE networking, and smart security — browse approved stores, pay with PayU, and track orders in one place.';
