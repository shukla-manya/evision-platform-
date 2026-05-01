import { twMerge } from 'tailwind-merge';

/** “Customer Review” title + subtitle with orbiting dot (see `.ev-review-heading-orbit` in `globals.css`). */
export function CustomerReviewsHeading({ className }: { className?: string }) {
  return (
    <div className={twMerge('flex flex-col items-center text-center mb-10', className)}>
      <div className="relative size-[4.5rem] sm:size-20 mb-5 shrink-0" aria-hidden>
        <div className="absolute inset-0 rounded-full border-2 border-ev-primary/30 bg-ev-primary/[0.05]" />
        <div className="absolute inset-0 ev-review-heading-orbit">
          <div className="absolute left-1/2 top-0 -translate-x-1/2 size-2.5 rounded-full bg-ev-primary shadow-[0_0_14px_rgba(232,83,42,0.55)]" />
        </div>
      </div>
      <h2 className="text-2xl sm:text-3xl font-bold text-ev-text mb-2">Customer Review</h2>
      <p className="text-ev-muted text-sm max-w-xl px-2">What our customers say about us?</p>
    </div>
  );
}
