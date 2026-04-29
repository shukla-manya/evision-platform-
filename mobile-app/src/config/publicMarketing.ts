/** Customer-facing lines (align with web `lib/public-contact` defaults). */
export const publicSupportPhoneDisplay =
  process.env.EXPO_PUBLIC_SUPPORT_PHONE?.trim() || '+91 93191 83121';

export function publicSupportTelHref(): string {
  const d = publicSupportPhoneDisplay.replace(/\D/g, '');
  if (d.length >= 10) return `tel:+${d.replace(/^\+?/, '')}`;
  return 'tel:+919319183121';
}

export const publicMarketingHomeTagline =
  'CCTV, PoE networking, and smart security — browse approved stores, pay with PayU, and track orders in one place.';
