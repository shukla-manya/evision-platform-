/**
 * Home / About customer review copy — keep quotes aligned with
 * `frontend-web/lib/home-cctv-content.ts` (`customerReviews`).
 */
export const homeCustomerReviewsHeadingTitle = 'Customer Review';
export const homeCustomerReviewsHeadingSubtitle = 'What our customers say about us?';

export type HomeCustomerReview = { quote: string; name: string; role: string };

export const homeCustomerReviews: HomeCustomerReview[] = [
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
];
