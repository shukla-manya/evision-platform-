import { twMerge } from 'tailwind-merge';

/** “Customer Review” section title + subtitle. */
export function CustomerReviewsHeading({ className }: { className?: string }) {
  return (
    <div className={twMerge('flex flex-col items-center text-center mb-10', className)}>
      <h2 className="text-2xl sm:text-3xl font-bold text-ev-text mb-2">Customer Review</h2>
      <p className="text-ev-muted text-sm max-w-xl px-2">What our customers say about us?</p>
    </div>
  );
}
