/** Static marketing copy for the storefront home (CCTV / security focus). */

/** Home hero carousel — external marketing URLs (GenSecurity, Wired, Sanity CDN). */
const heroIndoorPhone =
  'https://www.gensecurity.com/hs-fs/hubfs/Blog/White%20male%20adjusting%20smart%20camera%20and%20monitoring%20camera%20on%20his%20phone%20on%20the%20couch.jpg?width=1000&name=White%20male%20adjusting%20smart%20camera%20and%20monitoring%20camera%20on%20his%20phone%20on%20the%20couch.jpg';
/** Same Wired asset as user link; path uses single-encoded spaces (works reliably in `<img>`). */
const heroOutdoorPtz =
  'https://media.wired.com/photos/688d807935e373d3f8979fcf/4:3/w_1920,c_limit/Reolink%20Altas%20PT%20Ultra%201%20SOURCE%20Simon%20Hill.png';
const heroHomeWide =
  'https://cdn.sanity.io/images/bg7k3vu8/production/41fd29e8197050e4291660561d3487f05f067aa9-1000x500.jpg?w=1000&h=500&auto=format';

/** Pexels CDN — reliable hotlinking for hero / cards (some legacy Unsplash photo IDs now return 404). */
const pexPhoto = (id: string, w: number) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=${w}`;

/** Unsplash via imgix — include `ixlib` for stable responses. */
const unsplashPhoto = (id: string, w: number) =>
  `https://images.unsplash.com/photo-${id}?ixlib=rb-4.0.3&auto=format&fit=crop&w=${w}&q=80`;

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
    imageSrc: heroIndoorPhone,
    imageAlt: 'Person on a sofa using a phone near an indoor smart security camera',
  },
  {
    title: 'Power Over Ethernet',
    subtitle: 'Reliable power and data in one cable for pro installs.',
    cta: 'Browse PoE gear',
    href: '/shop?search=PoE',
    imageSrc: heroOutdoorPtz,
    imageAlt: 'Outdoor pan-tilt security camera mounted on a fence',
  },
  {
    title: 'Smart Security Kits',
    subtitle: 'Everything you need to get started with multi-camera coverage.',
    cta: 'Shop kits',
    href: '/shop?search=security%20kit',
    imageSrc: heroHomeWide,
    imageAlt: 'Home security camera with a house and garage in the background',
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

export const customQuoteSectionBackgroundSrc = unsplashPhoto('1504384308090-c894fdcc538d', 1920);

/** “Join as technician” home card — field install / service (Pexels). */
export const homeJoinTechnicianSectionImageSrc = pexPhoto('8006614', 1200);

export const homeJoinTechnicianSectionImageAlt =
  'Technician working on wiring and equipment for a professional security install';

/** “Register as dealer” home card — warehouse / wholesale (Pexels). */
export const homeDealerSectionImageSrc = pexPhoto('1267320', 1200);

export const homeDealerSectionImageAlt =
  'Warehouse aisle with stocked shelves — wholesale distribution and bulk fulfilment';

/** Left visual beside the home lead (mailto) form — CCTV on wall (Pexels). */
export const homeLeadFormImageSrc = pexPhoto('430208', 1200);

export const homeLeadFormImageAlt = 'CCTV camera installed for home and business security';

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
