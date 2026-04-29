/** Customer-facing support (override in production via env). */
export const publicSupportEmail =
  process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim() || 'support@evisionindia.com';

export const publicMarketingEmail =
  process.env.NEXT_PUBLIC_MARKETING_EMAIL?.trim() || 'marketing@evisionindia.com';

export const publicSupportPhone =
  process.env.NEXT_PUBLIC_SUPPORT_PHONE?.trim() || '+91 93191 83121';

export const publicSalesPhone =
  process.env.NEXT_PUBLIC_SALES_PHONE?.trim() || '+91 98112 50806';

export const publicCompanyLegalName = 'E vision Pvt. Ltd.';

export const publicRegisteredAddress =
  'E-Vision India, 9/205, Main Market, Near PNB, Old Faridabad — 121002';
