/**
 * “Security Camera Collection” home band — copy matches web `securityCameraCollection*` in
 * `frontend-web/lib/home-cctv-content.ts`; preview lines match first two `showcaseCombos` entries.
 */
export const HOME_COMBO_COLLECTION_TITLE = 'Security Camera Collection';

export const HOME_COMBO_COLLECTION_BODY =
  'Discover high-performance Evision surveillance cameras and recording systems engineered for clear visuals, smart monitoring, and long-lasting security protection for residential and commercial properties.';

export type HomeComboPreviewItem = {
  name: string;
  categoryLine: string;
  priceInr: number;
  searchQuery: string;
  inStock: boolean;
};

export const HOME_COMBO_PREVIEW_ITEMS: HomeComboPreviewItem[] = [
  {
    name: '5MP Analogue Set',
    categoryLine: 'IP Cameras Set, Pure Comfort',
    priceInr: 15999,
    searchQuery: '5MP Analogue',
    inStock: true,
  },
  {
    name: '4MP IP Setup',
    categoryLine: 'IP Cameras Set, Premium Comfort',
    priceInr: 25999,
    searchQuery: '4MP IP Setup',
    inStock: true,
  },
];
