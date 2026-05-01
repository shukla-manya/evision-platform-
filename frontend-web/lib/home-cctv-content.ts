/** Static marketing copy for the storefront home (CCTV / security focus). */

export type StaticShowcaseProduct = {
  name: string;
  categoryLine: string;
  rating: number;
  inStock: boolean;
  priceInr: number;
  hot?: boolean;
  searchQuery: string;
};

export const heroPromoCards = [
  {
    title: 'Wi-Fi CCTV Cameras',
    subtitle: 'All-new and loveable.',
    cta: 'Buy Now',
    href: '/shop?search=Wi-Fi%20CCTV',
    artClass: 'from-slate-800 via-slate-700 to-slate-900',
  },
  {
    title: 'Power Over Ethernet',
    subtitle: 'Reliable power & data in one cable.',
    cta: 'Buy Now',
    href: '/shop?search=PoE',
    artClass: 'from-emerald-900 via-teal-800 to-cyan-900',
  },
  {
    title: 'Smart Security Kits',
    subtitle: 'Everything you need to get started.',
    cta: 'Buy Now',
    href: '/shop?search=security%20kit',
    artClass: 'from-amber-900 via-orange-800 to-red-950',
  },
] as const;

/** Home “where are you installing?” row — labels read like store category chips, not keyword spam. */
export const businessSegmentsSectionTitle = 'Browse by site';

export const businessSegments = [
  { label: 'Offices & retail', href: '/shop?search=business%20CCTV' },
  { label: 'Farmhouses & land', href: '/shop?search=farm%20CCTV' },
  { label: 'Healthcare', href: '/shop?search=hospital%20CCTV' },
  { label: 'Homes', href: '/shop?search=home%20CCTV' },
  { label: 'Schools & colleges', href: '/shop?search=school%20CCTV' },
] as const;

export const showcasePrimary: StaticShowcaseProduct[] = [
  { name: 'Gigabit SFP Module', categoryLine: 'Power Over Ethernet', rating: 4.7, inStock: true, priceInr: 999, hot: false, searchQuery: 'Gigabit SFP' },
  { name: 'Basic Guard', categoryLine: 'CCTV Cameras, Indoor WiFi Series', rating: 4.6, inStock: true, priceInr: 1800, hot: true, searchQuery: 'Basic Guard' },
  { name: 'Gigabyte Media Converter', categoryLine: 'Power Over Ethernet', rating: 4.55, inStock: true, priceInr: 1899, hot: false, searchQuery: 'Media Converter' },
  { name: 'Smart Guard', categoryLine: 'CCTV Cameras, Indoor WiFi Series', rating: 4.65, inStock: false, priceInr: 2500, hot: true, searchQuery: 'Smart Guard' },
  { name: '4G Watch Pro', categoryLine: 'CCTV Cameras, Outdoor 4G Series', rating: 4.75, inStock: false, priceInr: 3199, hot: true, searchQuery: '4G Watch Pro' },
  { name: '4+2 AI PoE switch', categoryLine: 'Power Over Ethernet', rating: 4.9, inStock: true, priceInr: 3899, hot: true, searchQuery: 'AI PoE switch' },
  { name: '4G Watch Max', categoryLine: 'CCTV Cameras, Outdoor 4G Series', rating: 4.75, inStock: true, priceInr: 3999, hot: true, searchQuery: '4G Watch Max' },
  { name: 'Solar Sentinel', categoryLine: 'CCTV Cameras, Solar Powered Series', rating: 5, inStock: true, priceInr: 5599, hot: true, searchQuery: 'Solar Sentinel' },
  { name: 'Solar Sentinel AI', categoryLine: 'CCTV Cameras, Solar Powered Series, AI Smart Camera', rating: 4.5, inStock: true, priceInr: 7599, hot: false, searchQuery: 'Solar Sentinel AI' },
  { name: '8+2 port managed PoE', categoryLine: 'Power Over Ethernet', rating: 4.76, inStock: true, priceInr: 8599, hot: false, searchQuery: 'managed PoE' },
];

export const showcaseCombos: StaticShowcaseProduct[] = [
  { name: '5MP Analogue Set', categoryLine: 'IP Cameras Set, Pure Comfort', rating: 4.65, inStock: true, priceInr: 15999, searchQuery: '5MP Analogue' },
  { name: '4MP IP Setup', categoryLine: 'IP Cameras Set, Premium Comfort', rating: 4.65, inStock: true, priceInr: 25999, searchQuery: '4MP IP Setup' },
  { name: '4 SET IP 8MP (AI)', categoryLine: 'IP Cameras Set, Ultra Luxury', rating: 4.4, inStock: true, priceInr: 35999, searchQuery: '8MP AI' },
];

export const customerReviews = [
  {
    quote:
      'We chose Evision for campus security, and the high-definition recording quality is remarkable. The cameras provide wide coverage and clear visuals, ensuring student safety. It’s a dependable and cost-effective security system.',
    name: 'Sneha Reddy',
    role: 'School Administrator',
  },
  {
    quote:
      'We installed Evision CCTV cameras at our showroom, and the high-definition video quality is outstanding. The footage is extremely clear, and we can easily monitor customer activity. Even the night vision works perfectly. It’s a reliable security solution for any business.',
    name: 'Rajesh Sharma',
    role: 'Business Owner',
  },
  {
    quote:
      'Evision cameras have exceeded our expectations. The HD video capturing is crystal clear, making it easy to monitor office premises. The system runs smoothly, and remote access through mobile is very convenient. Highly recommended for corporate offices.',
    name: 'Priya Nair',
    role: 'HR Manager',
  },
  {
    quote:
      'The video clarity of Evision CCTV cameras is impressive. We can clearly identify faces and movements even during low light conditions. The installation process was simple, and the performance has been excellent so far.',
    name: 'Amit Verma',
    role: 'Store Manager',
  },
] as const;
