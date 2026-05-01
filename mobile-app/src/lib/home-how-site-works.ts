export const HOME_HOW_SITE_KICKER = 'How this site works';

export const HOME_HOW_SITE_CARDS = [
  {
    kicker: 'Shops',
    icon: 'storefront-outline' as const,
    title: 'A real shop name on every listing',
    body:
      'Stores apply before they can sell. If a product is live, the shop name on the card is who stocks it and who you are buying from—not a mystery fulfilment centre.',
  },
  {
    kicker: 'Cart',
    icon: 'layers-triple-outline' as const,
    title: 'One PayU payment, split behind the scenes',
    body:
      'Your cart can mix SKUs from two different approved shops. You still get a single PayU payment; **My orders** lists line items by shop so you know who is shipping what.',
  },
  {
    kicker: 'Dispatch',
    icon: 'truck-outline' as const,
    title: 'AWB only after the shop books courier',
    body:
      'Tracking appears when the shop actually hands the parcel to the carrier. Carrier name and AWB land on the order row—nothing is invented earlier to look busy.',
  },
  {
    kicker: 'On-site',
    icon: 'wrench-outline' as const,
    title: 'Technicians when your pincode is covered',
    body:
      'You can request install or service from technicians on the platform where we have coverage. It stays under your login so you are not DMing random numbers off a receipt.',
  },
  {
    kicker: 'PayU',
    icon: 'credit-card-outline' as const,
    title: 'Hosted checkout you have seen elsewhere',
    body:
      "UPI, cards, and net banking are processed on PayU's page—the redirect flow Indian shoppers already recognise. We do not hold card numbers on E vision.",
  },
  {
    kicker: 'Dealers',
    icon: 'receipt-text-outline' as const,
    title: 'GSTIN unlocks dealer columns',
    body:
      'Sign up as a dealer with a valid GSTIN. After verification, any shop that published a dealer price shows it in the catalogue for your account—same site, different columns.',
  },
] as const;
