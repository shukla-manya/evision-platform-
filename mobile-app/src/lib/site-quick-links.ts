/** Footer quick nav — paths match web `lib/site-quick-links.ts` (opened via `publicWebUrl`). */
export const footerQuickNavLinks: { label: string; path: string }[] = [
  { label: 'Home', path: '/' },
  { label: 'About', path: '/about' },
  { label: 'Shop', path: '/shop' },
  { label: 'Blog', path: '/blog' },
  { label: 'Contact', path: '/contact' },
  { label: 'Support', path: '/support' },
];

export const footerPolicyLinks: { label: string; path: string }[] = [
  { label: 'Return & Refund Policy', path: '/policies/returns-refund' },
  { label: 'Terms and Conditions', path: '/terms' },
  { label: 'Privacy Policy', path: '/privacy' },
  { label: 'Shipping Policy', path: '/policies/shipping' },
  { label: 'Pricing Policy', path: '/policies/pricing' },
  { label: 'Cancellation Policy', path: '/policies/cancellation' },
];

/** @deprecated Prefer `footerQuickNavLinks` + `footerPolicyLinks`. */
export const siteQuickLinks: { label: string; path: string }[] = [...footerQuickNavLinks, ...footerPolicyLinks];
