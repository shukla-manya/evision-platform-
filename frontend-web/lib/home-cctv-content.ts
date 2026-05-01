/** Static marketing copy for the storefront home (CCTV / security focus). */

/** Home hero + promo tiles — Wi‑Fi CCTV, PoE, smart kits (Future CDN, Wikimedia Commons, Contentful). */
const heroWifiCctv =
  'https://cdn.mos.cms.futurecdn.net/tMajjm2ZCo3a5ZyGVgt2JG.jpg';
const heroPoeSetup =
  'https://upload.wikimedia.org/wikipedia/commons/f/f1/ZyXEL_ZyAIR_G-1000_and_D-Link_DWL-P50_20060829_2.jpg';
const heroSmartSecurityKit =
  'https://images.ctfassets.net/n58cc9djl3c5/3yGoaL5yznxTszN9bg53g5/715e0584582269d9d71060eda3083886/HSS_Cameras.webp';

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
    imageSrc: heroWifiCctv,
    imageAlt: 'Outdoor Wi-Fi security camera mounted under an eave',
  },
  {
    title: 'Power Over Ethernet',
    subtitle: 'Reliable power and data in one cable for pro installs.',
    cta: 'Browse PoE gear',
    href: '/shop?search=PoE',
    imageSrc: heroPoeSetup,
    imageAlt: 'ZyXEL access point and D-Link PoE adapter wired to a wall jack',
  },
  {
    title: 'Smart Security Kits',
    subtitle: 'Everything you need to get started with multi-camera coverage.',
    cta: 'Shop kits',
    href: '/shop?search=security%20kit',
    imageSrc: heroSmartSecurityKit,
    imageAlt: 'Smart home security cameras and video doorbell on a table',
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

/** “Join as technician” home card + technician services page hero (Aquatech India marketing asset). */
export const homeJoinTechnicianSectionImageSrc =
  'https://aquatechindia.com/wp-content/uploads/2023/08/17.webp';

export const homeJoinTechnicianSectionImageAlt =
  'Technician illustration with CCTV cameras, recorder, cabling, and install accessories';

/** “Register as dealer” home card — distributor vs dealer (DifferenceBetween.net; hotlink may change). */
export const homeDealerSectionImageSrc =
  'https://www.differencebetween.net/wp-content/uploads/2018/04/Difference-Between-Distributor-ad-Dealer.jpg';

export const homeDealerSectionImageAlt =
  'Concept illustration for dealer and distributor roles — wholesale and channel partners';

/** Left visual beside the home lead (mailto) form — CCTV on wall (Pexels). */
export const homeLeadFormImageSrc = pexPhoto('430208', 1200);

export const homeLeadFormImageAlt = 'CCTV camera installed for home and business security';
