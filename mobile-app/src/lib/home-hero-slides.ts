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

export const HOME_HERO_SLIDES: HomeHeroSlide[] = [
  {
    title: 'Wi-Fi CCTV Cameras',
    subtitle: 'All-new and loveable — wireless indoor and outdoor lines.',
    cta: 'Browse Wi-Fi CCTV',
    href: '/shop?search=Wi-Fi%20CCTV',
    imageUri:
      'https://images.pexels.com/photos/430208/pexels-photo-430208.jpeg?auto=compress&cs=tinysrgb&w=1200',
  },
  {
    title: 'Power Over Ethernet',
    subtitle: 'Reliable power and data in one cable for pro installs.',
    cta: 'Browse PoE gear',
    href: '/shop?search=PoE',
    imageUri:
      'https://images.pexels.com/photos/7514838/pexels-photo-7514838.jpeg?auto=compress&cs=tinysrgb&w=1200',
  },
  {
    title: 'Smart Security Kits',
    subtitle: 'Everything you need to get started with multi-camera coverage.',
    cta: 'Shop kits',
    href: '/shop?search=security%20kit',
    imageUri:
      'https://images.pexels.com/photos/96612/pexels-photo-96612.jpeg?auto=compress&cs=tinysrgb&w=1200',
  },
];

export const HOME_PROMO_STRIP_CARDS = HOME_HERO_SLIDES.map((s) => ({
  title: s.title,
  cta: 'Buy Now' as const,
  href: s.href,
  imageUri: s.imageUri,
}));
