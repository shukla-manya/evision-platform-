'use client';

import { useEffect, useState } from 'react';
import { Star } from 'lucide-react';
import { marqueeTestimonials } from '@/lib/public-testimonials';

function TestimonialCard({
  quote,
  name,
  role,
  suffix,
}: {
  quote: string;
  name: string;
  role: string;
  suffix: string;
}) {
  return (
    <figure
      className="ev-card shrink-0 w-[min(100vw-2rem,320px)] sm:w-[300px] border-ev-border p-5 shadow-ev-sm"
      aria-label={`Testimonial from ${name}`}
    >
      <div className="flex gap-0.5 text-amber-500 mb-3" aria-hidden>
        {Array.from({ length: 5 }, (_, i) => (
          <Star key={i} size={14} className="fill-amber-400 text-amber-500" />
        ))}
      </div>
      <blockquote className="text-ev-text text-sm leading-relaxed m-0">&ldquo;{quote}&rdquo;</blockquote>
      <figcaption className="mt-4 text-xs sm:text-sm">
        <span className="font-semibold text-ev-primary">{name}</span>
        <span className="text-ev-muted"> — {role}</span>
      </figcaption>
    </figure>
  );
}

export function TestimonialsMarquee() {
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const apply = () => setReduceMotion(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  if (reduceMotion) {
    return (
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-6xl mx-auto">
        {marqueeTestimonials.map((t) => (
          <TestimonialCard key={t.id} quote={t.quote} name={t.name} role={t.role} suffix={t.id} />
        ))}
      </div>
    );
  }

  const loop = [...marqueeTestimonials, ...marqueeTestimonials];

  return (
    <div className="ev-marquee-outer overflow-hidden -mx-4 sm:-mx-6 lg:-mx-8 px-0">
      <div className="ev-marquee-track py-1">
        {loop.map((t, i) => (
          <TestimonialCard key={`${t.id}-${i}`} quote={t.quote} name={t.name} role={t.role} suffix={`${t.id}-${i}`} />
        ))}
      </div>
    </div>
  );
}
