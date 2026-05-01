/**
 * About page copy + image URLs — keep in sync with `frontend-web/lib/about-company-content.ts`.
 * Long-form company & services copy (About + home “What we provide”).
 */

export const aboutWhatWeProvideTitle = 'What We Provide to Our Customers?';

export const aboutWhatWeProvideParagraphs: string[] = [
  'E-vision is a leading solution provider of electronic security and safety equipment in India since 2000. As the Best Home CCTV Camera System supplier, our professional approach in designing and manufacturing systems for optimal application is backed by the latest technology, quality, and customer support. Many of the solutions have been developed from scratch in response to the specific needs of our customers.',
  'Our Fully Digital Process CCD camera is unique in that all of its functions are controlled by software. We believe that your testing one sample will show the consistent reliability and performance of our products, we can guarantee the same quality in mass-production afterwards.',
  'Using modern automated SMT equipment for quality production Automated Manufacturing facilities. To ensure ISO 9001, high quality manufactured products, Hunt has computerized all of its manufacturing process with automatic insertion SMT and ICT equipment in a dust free environment, which can more efficiently increase our production capacity.',
];

export const premierServicesTitle = 'Premier Services Tailored to Your Security Needs';

export const premierServicesIntro =
  'E-Vision India is one of the best security service providers for both residential & commercial spaces or public places that require surveillance. Some of the key services that our company offers to patronage are fingerprint access control systems which are far much advanced than the traditional ones, smart home systems which are trendier, security consulting and high definition closed circuit cameras which are of excellent quality. By the effective and creative ideas on the offered services and dedication for customer service we provide effective, reliable and secure safety services that will be trusted. To avail the best in class and services of security services that are tailored made then E-Vision India the right choice.';

export const premierServiceCards: { title: string; body: string }[] = [
  {
    title: 'Customized Plan',
    body: 'Flexible customized plans designed to meet your specific security and technology requirements.',
  },
  {
    title: 'Smart Home System',
    body: 'The best home security camera systems included frontpoint, ADT, Vivint, abode and Ring Alarm',
  },
  {
    title: 'Security Consulting',
    body: 'A security consultant is someone who works for different businesses assessing risks, problems, solutions',
  },
  {
    title: 'Closed Circuit Cameras',
    body: 'A closed-circuit television camera can produce images or recordings for private purposes',
  },
];

export const aboutBrandSummary =
  'EVISION is a surveillance solutions brand delivering high-performance CCTV systems and advanced network infrastructure, including PoE and AI-based technologies for reliable security across homes, businesses, and large-scale projects.';

const pexPhoto = (id: string, w: number) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=${w}`;

export const aboutPrimaryVisualSrc = pexPhoto('163100', 1600);
export const aboutPrimaryVisualAlt =
  'Printed circuit boards and electronic components in a manufacturing setting';

