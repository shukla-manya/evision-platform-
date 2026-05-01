export const HOME_HOW_SITE_KICKER = 'How this site works';

export const HOME_HOW_SITE_INTRO =
  'The marketplace is built around real checkout, orders, and fulfilment. Below is what you can rely on today.';

export const HOME_HOW_SITE_CARDS = [
  {
    kicker: 'Sellers',
    icon: 'storefront-outline' as const,
    title: 'Shops are vetted before they sell',
    body:
      'Partner stores go through onboarding and approval. When a listing is live, the shop name on the product is the same shop that fulfils your line item.',
  },
  {
    kicker: 'Checkout',
    icon: 'layers-triple-outline' as const,
    title: 'One payment, multiple sellers',
    body:
      'Your bag can include items from more than one approved shop. You pay once at checkout; **My orders** keeps per-shop splits readable afterward.',
  },
  {
    kicker: 'Fulfilment',
    icon: 'truck-outline' as const,
    title: 'Tracking shows up on the order',
    body: 'When a shop books dispatch, AWB and carrier details are written back to **My orders**.',
  },
  {
    kicker: 'Service',
    icon: 'wrench-outline' as const,
    title: 'Technicians tied to what you bought',
    body: 'After delivery, book install or help from the same account flows linked to your purchase.',
  },
  {
    kicker: 'Payments',
    icon: 'credit-card-outline' as const,
    title: 'PayU at checkout',
    body: 'UPI, cards, and netbanking run through PayU on the hosted checkout you already know.',
  },
  {
    kicker: 'B2B',
    icon: 'receipt-text-outline' as const,
    title: 'Dealer pricing in the same login',
    body: 'Register with a GSTIN to unlock dealer columns where shops publish them.',
  },
] as const;
