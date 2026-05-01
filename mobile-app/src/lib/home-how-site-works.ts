export const HOME_HOW_SITE_KICKER = 'How this site works';

export const HOME_HOW_SITE_CARDS = [
  {
    kicker: 'Partners',
    icon: 'storefront-outline' as const,
    title: 'The shop on the card is who you paid',
    body:
      'Nobody lists until someone has looked at the signup. Corny but true: if you see a shop name next to a SKU, that shop is supposed to pick and pack it. There is no invisible middle layer we swap in later.',
  },
  {
    kicker: 'Basket',
    icon: 'layers-triple-outline' as const,
    title: 'Throw two cities in one cart if you want',
    body:
      'Cable from one partner, NVR from another, same checkout. PayU still collects once. When you need proof of who owes you a box, **My orders** already groups rows by shop so you are not doing spreadsheet surgery.',
  },
  {
    kicker: 'Courier',
    icon: 'truck-outline' as const,
    title: 'Tracking shows up when the parcel actually moves',
    body:
      'Before pickup you will just see preparing. After the shop books AWB, carrier + number land on the line. We are allergic to fake tracking links on day zero to keep investors happy.',
  },
  {
    kicker: 'Help',
    icon: 'wrench-outline' as const,
    title: 'Technician visits only where we opened the map',
    body:
      'Raise a visit from the same login you ordered with if your pincode is inside the service bubble. If we have not switched your area on yet, the button will tell you straight—better than a promise we cannot keep.',
  },
  {
    kicker: 'Money',
    icon: 'credit-card-outline' as const,
    title: 'PayU opens in the usual redirect tab',
    body:
      "UPI, card, netbanking all happen on PayU's hosted page, same pattern you have probably hit on other Indian retail sites. Card data never touches our own servers; we are fine admitting that.",
  },
  {
    kicker: 'B2B',
    icon: 'receipt-text-outline' as const,
    title: 'Dealer rates need a GSTIN and a human tick',
    body:
      'Register with your company GSTIN, send what finance asks for, wait for someone to flip you to verified. Then catalogue prices swap to dealer numbers wherever a shop bothered to maintain them. Still this domain, no secret portal.',
  },
] as const;
