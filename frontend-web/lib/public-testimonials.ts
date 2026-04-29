/** Short quotes for the “Trusted by teams across India” marquee (fictional roles; representative use cases). */
export type MarqueeTestimonial = {
  id: string;
  quote: string;
  name: string;
  role: string;
};

export const marqueeTestimonials: MarqueeTestimonial[] = [
  {
    id: '1',
    quote:
      'We standardised on their PoE switches for our warehouse CCTV refresh. Uptime has been solid and support actually picks up the phone.',
    name: 'Rajesh K.',
    role: 'IT Head, logistics (NCR)',
  },
  {
    id: '2',
    quote:
      'Clear specs, honest pricing, and quick dispatch. Our integrator team orders cameras and accessories from here without second-guessing compatibility.',
    name: 'Ananya M.',
    role: 'Project lead, systems integrator (Pune)',
  },
  {
    id: '3',
    quote:
      'After a bad experience with grey-market gear elsewhere, Evision kit was plug-and-play with our NVR. Night colour on the domes exceeded what we expected.',
    name: 'Vikram S.',
    role: 'Facility manager, retail chain (Hyderabad)',
  },
  {
    id: '4',
    quote:
      'We needed a managed PoE backbone for a school campus. Their team helped size VLANs and SFP links — delivery landed before our term break deadline.',
    name: 'Neha P.',
    role: 'Network consultant (Ahmedabad)',
  },
  {
    id: '5',
    quote:
      'Dealer pricing and GST paperwork were straightforward. Our clients get branded invoices and we get predictable lead times on repeat SKUs.',
    name: 'Imran H.',
    role: 'Dealer partner (Lucknow)',
  },
  {
    id: '6',
    quote:
      'Outdoor 4G cameras for a remote site were a headache until we tried their kit. Signal handling and enclosure quality are noticeably above budget imports.',
    name: 'Deepa R.',
    role: 'Operations, construction (Kochi)',
  },
  {
    id: '7',
    quote:
      'From enquiry on the site to tracking on my order page — the flow feels modern. When a courier delay happened, support replied the same day.',
    name: 'Karthik N.',
    role: 'Small business owner (Chennai)',
  },
  {
    id: '8',
    quote:
      'We deploy access control and CCTV together. Having PoE, fibre media converters, and cameras from one catalogue speeds up our BOQ cycles.',
    name: 'Meera T.',
    role: 'Security integrator (Bengaluru)',
  },
];
