/** Customer-facing support (override in production via env). */
export const publicSupportEmail =
  process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim() || 'support@evisionpvtltd.com';

export const publicSupportPhone =
  process.env.NEXT_PUBLIC_SUPPORT_PHONE?.trim() || '+91 80 0000 0000';

export const publicCompanyLegalName = 'E Vision Pvt. Ltd.';
