/** “Innovation” home strip — aligned with web `innovationSection*` in `frontend-web/lib/home-cctv-content.ts`. */
export const HOME_INNOVATION_TITLE = 'Standing at the Forefront of Innovation';

export const HOME_INNOVATION_BODY =
  'As we explore new technology, we push the capabilities of what is possible, driving progress through continuous innovation.';

export type HomeInnovationPhoto = { uri: string; caption: string; accessibilityLabel: string };

export const HOME_INNOVATION_PHOTOS: HomeInnovationPhoto[] = [
  {
    uri: 'https://images.unsplash.com/photo-1557598376-da691ed6591f?auto=format&fit=crop&w=1200&q=80',
    caption: 'Residential — at home',
    accessibilityLabel: 'Wall-mounted security camera at a residential entrance',
  },
  {
    uri: 'https://images.unsplash.com/photo-1616410738646-a66a3169768f?auto=format&fit=crop&w=1200&q=80',
    caption: 'Office & business sites',
    accessibilityLabel: 'Dome CCTV camera installed in a commercial ceiling',
  },
];
