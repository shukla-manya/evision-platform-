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

/** Full-bleed home hero carousel (web + mobile copy aligned). */
export const homeHeroSlides = [
  {
    title: 'Wi-Fi CCTV Cameras',
    subtitle: 'All-new and loveable — wireless indoor and outdoor lines.',
    cta: 'Browse Wi-Fi CCTV',
    href: '/shop?search=Wi-Fi%20CCTV',
    imageSrc:
      'https://images.unsplash.com/photo-1557598376-da691ed6591f?auto=format&fit=crop&w=1920&q=80',
    imageAlt: 'Security camera mounted near a doorway',
  },
  {
    title: 'Power Over Ethernet',
    subtitle: 'Reliable power and data in one cable for pro installs.',
    cta: 'Browse PoE gear',
    href: '/shop?search=PoE',
    imageSrc:
      'https://images.unsplash.com/photo-1616410738646-a66a3169768f?auto=format&fit=crop&w=1920&q=80',
    imageAlt: 'Dome CCTV camera on a ceiling',
  },
  {
    title: 'Smart Security Kits',
    subtitle: 'Everything you need to get started with multi-camera coverage.',
    cta: 'Shop kits',
    href: '/shop?search=security%20kit',
    imageSrc:
      'https://images.unsplash.com/photo-1587825140708-dfaf72ae4b04?auto=format&fit=crop&w=1920&q=80',
    imageAlt: 'Modern workspace with laptop and accessories',
  },
] as const;

/** Kicker + three image tiles directly under the home hero (matches carousel topics; CTA copy “Buy Now”). */
export const homePromoStripKicker = 'All-new and loveable.';

export const homePromoStripCards = [
  {
    title: 'Wi-Fi CCTV Cameras',
    cta: 'Buy Now',
    href: '/shop?search=Wi-Fi%20CCTV',
    imageSrc: homeHeroSlides[0].imageSrc,
    imageAlt: homeHeroSlides[0].imageAlt,
  },
  {
    title: 'Power Over Ethernet',
    cta: 'Buy Now',
    href: '/shop?search=PoE',
    imageSrc: homeHeroSlides[1].imageSrc,
    imageAlt: homeHeroSlides[1].imageAlt,
  },
  {
    title: 'Smart Security Kits',
    cta: 'Buy Now',
    href: '/shop?search=security%20kit',
    imageSrc: homeHeroSlides[2].imageSrc,
    imageAlt: homeHeroSlides[2].imageAlt,
  },
] as const;

/** Home “where are you installing?” row — labels read like store category chips, not keyword spam. */
export const businessSegmentsSectionTitle = 'Browse by site';

export const businessSegments = [
  { label: 'Business Security', href: '/shop?search=business%20CCTV' },
  { label: 'Farm House Security', href: '/shop?search=farm%20CCTV' },
  { label: 'Hospital Security', href: '/shop?search=hospital%20CCTV' },
  { label: 'House Security', href: '/shop?search=home%20CCTV' },
  { label: 'School Security', href: '/shop?search=school%20CCTV' },
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

/** Home “Security Camera Collection” band — copy block (paired with first two combo tiles on web). */
export const securityCameraCollectionTitle = 'Security Camera Collection';

export const securityCameraCollectionIntro =
  'Discover high-performance Evision surveillance cameras and recording systems engineered for clear visuals, smart monitoring, and long-lasting security protection for residential and commercial properties.';

/** Home “custom quote” band — full-bleed image + overlay (web + mobile use same art direction). */
export const customQuoteSectionTitle = 'Customized Security Solutions';

export const customQuoteSectionBody =
  'Get CCTV systems designed specifically for your home or business security needs.';

export const customQuoteSectionCta = 'Get a Custom Quote';

export const customQuoteSectionBackgroundSrc =
  'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=1920&q=80';

/** “Innovation” strip — copy + two install photos (home vs office). */
export const innovationSectionTitle = 'Standing at the Forefront of Innovation';

export const innovationSectionBody =
  'As we explore new technology, we push the capabilities of what is possible, driving progress through continuous innovation.';

/** Left visual beside the home lead (mailto) form — CCTV install. */
export const homeLeadFormImageSrc =
  'https://images.unsplash.com/photo-1557598376-da691ed6591f?auto=format&fit=crop&w=1200&q=80';

export const homeLeadFormImageAlt = 'CCTV camera installed for home and business security';

export const innovationInstallImages = [
  {
    src: 'https://images.unsplash.com/photo-1557598376-da691ed6591f?auto=format&fit=crop&w=1200&q=80',
    alt: 'Wall-mounted security camera at a residential entrance',
    caption: 'Residential — at home',
  },
  {
    src: 'https://images.unsplash.com/photo-1616410738646-a66a3169768f?auto=format&fit=crop&w=1200&q=80',
    alt: 'Dome CCTV camera installed in a commercial ceiling',
    caption: 'Office & business sites',
  },
] as const;

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
