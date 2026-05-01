/** Home tab hero carousel — image URLs match web `homeHeroSlides` in `frontend-web/lib/home-cctv-content.ts`. */
const heroIndoorPhone =
  'https://www.gensecurity.com/hs-fs/hubfs/Blog/White%20male%20adjusting%20smart%20camera%20and%20monitoring%20camera%20on%20his%20phone%20on%20the%20couch.jpg?width=1000&name=White%20male%20adjusting%20smart%20camera%20and%20monitoring%20camera%20on%20his%20phone%20on%20the%20couch.jpg';
const heroOutdoorPtz =
  'https://media.wired.com/photos/688d807935e373d3f8979fcf/4:3/w_640%2Cc_limit/Reolink%2520Altas%2520PT%2520Ultra%25201%2520SOURCE%2520Simon%2520Hill.png';
const heroHomeWide =
  'https://cdn.sanity.io/images/bg7k3vu8/production/41fd29e8197050e4291660561d3487f05f067aa9-1000x500.jpg?w=1000&h=500&auto=format';

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
    imageUri: heroIndoorPhone,
  },
  {
    title: 'Power Over Ethernet',
    subtitle: 'Reliable power and data in one cable for pro installs.',
    cta: 'Browse PoE gear',
    href: '/shop?search=PoE',
    imageUri: heroOutdoorPtz,
  },
  {
    title: 'Smart Security Kits',
    subtitle: 'Everything you need to get started with multi-camera coverage.',
    cta: 'Shop kits',
    href: '/shop?search=security%20kit',
    imageUri: heroHomeWide,
  },
];

export const HOME_PROMO_STRIP_CARDS = HOME_HERO_SLIDES.map((s) => ({
  title: s.title,
  cta: 'Buy Now' as const,
  href: s.href,
  imageUri: s.imageUri,
}));
