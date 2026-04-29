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
  'E-Vision India, 9/205, Main Market, Near PNB, Old Faridabad-121002';

/** Shown on Contact and aligned footers (keep in sync with mobile `publicMarketing.ts`). */
export const publicBrandTagline =
  'EVISION is a surveillance solutions brand delivering high-performance CCTV systems and advanced network infrastructure, including PoE and AI-based technologies for reliable security across homes, businesses, and large-scale projects.';

export const publicCopyrightNotice =
  'Copyright © 2026 Evision Powered by Cybrical Tech LLP.';
