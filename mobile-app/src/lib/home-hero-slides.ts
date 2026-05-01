/** Home tab hero carousel — image URLs match web `homeHeroSlides` in `frontend-web/lib/home-cctv-content.ts`. */
const heroWifiCctv = 'https://cdn.mos.cms.futurecdn.net/tMajjm2ZCo3a5ZyGVgt2JG.jpg';
const heroPoeSetup =
  'https://upload.wikimedia.org/wikipedia/commons/f/f1/ZyXEL_ZyAIR_G-1000_and_D-Link_DWL-P50_20060829_2.jpg';
const heroSmartSecurityKit =
  'https://images.ctfassets.net/n58cc9djl3c5/3yGoaL5yznxTszN9bg53g5/715e0584582269d9d71060eda3083886/HSS_Cameras.webp';

export type HomeHeroSlide = {
  title: string;
  subtitle: string;
  cta: string;
  href: string;
  imageUri: string;
};

/** Shown under the home hero carousel — same imagery, “Buy Now” CTAs. */
export const HOME_PROMO_STRIP_KICKER = 'All-new and loveable.';

export const HOME_HERO_SLIDES: HomeHeroSlide[] = [
  {
    title: 'Wi-Fi CCTV Cameras',
    subtitle: 'All-new and loveable — wireless indoor and outdoor lines.',
    cta: 'Browse Wi-Fi CCTV',
    href: '/shop?search=Wi-Fi%20CCTV',
    imageUri: heroWifiCctv,
  },
  {
    title: 'Power Over Ethernet',
    subtitle: 'Reliable power and data in one cable for pro installs.',
    cta: 'Browse PoE gear',
    href: '/shop?search=PoE',
    imageUri: heroPoeSetup,
  },
  {
    title: 'Smart Security Kits',
    subtitle: 'Everything you need to get started with multi-camera coverage.',
    cta: 'Shop kits',
    href: '/shop?search=security%20kit',
    imageUri: heroSmartSecurityKit,
  },
];

export const HOME_PROMO_STRIP_CARDS = HOME_HERO_SLIDES.map((s) => ({
  title: s.title,
  cta: 'Buy Now' as const,
  href: s.href,
  imageUri: s.imageUri,
}));
