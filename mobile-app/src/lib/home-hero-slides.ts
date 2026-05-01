/** Home tab hero carousel — paths match web `homeHeroSlides` in `frontend-web/lib/home-cctv-content.ts`. */
export type HomeHeroSlide = {
  title: string;
  subtitle: string;
  cta: string;
  href: string;
  imageUri: string;
};

/** Shown under the home hero carousel — same imagery, “Buy Now” CTAs. */
export const HOME_PROMO_STRIP_KICKER = 'All-new and loveable.';

export const HOME_PROMO_STRIP_CARDS = HOME_HERO_SLIDES.map((s) => ({
  title: s.title,
  cta: 'Buy Now' as const,
  href: s.href,
  imageUri: s.imageUri,
}));

export const HOME_HERO_SLIDES: HomeHeroSlide[] = [
  {
    title: 'Wi-Fi CCTV Cameras',
    subtitle: 'All-new and loveable — wireless indoor and outdoor lines.',
    cta: 'Browse Wi-Fi CCTV',
    href: '/shop?search=Wi-Fi%20CCTV',
    imageUri:
      'https://images.unsplash.com/photo-1557598376-da691ed6591f?auto=format&fit=crop&w=1200&q=80',
  },
  {
    title: 'Power Over Ethernet',
    subtitle: 'Reliable power and data in one cable for pro installs.',
    cta: 'Browse PoE gear',
    href: '/shop?search=PoE',
    imageUri:
      'https://images.unsplash.com/photo-1616410738646-a66a3169768f?auto=format&fit=crop&w=1200&q=80',
  },
  {
    title: 'Smart Security Kits',
    subtitle: 'Everything you need to get started with multi-camera coverage.',
    cta: 'Shop kits',
    href: '/shop?search=security%20kit',
    imageUri:
      'https://images.unsplash.com/photo-1587825140708-dfaf72ae4b04?auto=format&fit=crop&w=1200&q=80',
  },
];
