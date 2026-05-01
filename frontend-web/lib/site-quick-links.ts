/** Primary nav links shown in the site footer (and synced mobile web URLs). */
export const footerQuickNavLinks: { label: string; href: string }[] = [
  { label: 'Home', href: '/' },
  { label: 'About', href: '/about' },
  { label: 'Shop', href: '/shop' },
  { label: 'Contact', href: '/contact' },
  { label: 'Support', href: '/support' },
];

export const footerPolicyLinks: { label: string; href: string }[] = [
  { label: 'Return & Refund Policy', href: '/policies/returns-refund' },
  { label: 'Terms and Conditions', href: '/terms' },
  { label: 'Privacy Policy', href: '/privacy' },
  { label: 'Shipping Policy', href: '/policies/shipping' },
  { label: 'Pricing Policy', href: '/policies/pricing' },
  { label: 'Cancellation Policy', href: '/policies/cancellation' },
];

/** @deprecated Prefer `footerQuickNavLinks` + `footerPolicyLinks` in new code. */
export const siteQuickLinks: { label: string; href: string }[] = [...footerQuickNavLinks, ...footerPolicyLinks];
