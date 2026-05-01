const FLOAT_DELAYS = ['0s', '0.14s', '0.28s', '0.42s', '0.56s'] as const;
const PULSE_DELAYS = ['0s', '0.2s', '0.4s', '0.6s', '0.8s'] as const;

/**
 * Decorative SVG above “browse by site” chips: five site types on a subtle animated network line.
 */
export function BrowseBySiteAnimatedSvg({ className }: { className?: string }) {
  return (
    <div
      className={`ev-browse-site-svg text-ev-primary ${className ?? ''}`}
      role="img"
      aria-label="Security solutions for business, farm, hospital, house, and school"
    >
      <svg
        className="mx-auto h-24 w-full max-w-lg sm:h-[6.75rem]"
        viewBox="0 0 520 88"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="evBrowseSiteWireGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.25" />
            <stop offset="50%" stopColor="currentColor" stopOpacity="0.65" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0.25" />
          </linearGradient>
        </defs>

        <path
          className="ev-browse-site-svg__wire"
          d="M44 66 C132 52 188 78 260 66 S388 52 476 66"
          stroke="url(#evBrowseSiteWireGrad)"
          strokeWidth="2.25"
          strokeLinecap="round"
        />

        <g className="ev-browse-site-svg__icon" style={{ animationDelay: FLOAT_DELAYS[0] }}>
          <circle className="ev-browse-site-svg__pulse" cx="44" cy="66" r="5" fill="currentColor" fillOpacity="0.2" style={{ animationDelay: PULSE_DELAYS[0] }} />
          <g transform="translate(44 34)">
            <rect x="-14" y="4" width="28" height="18" rx="1.5" fill="currentColor" fillOpacity="0.35" />
            <rect x="-10" y="-8" width="20" height="14" rx="1.5" fill="currentColor" fillOpacity="0.55" />
            <rect x="-6" y="-20" width="12" height="14" rx="1" fill="currentColor" />
          </g>
        </g>

        <g className="ev-browse-site-svg__icon" style={{ animationDelay: FLOAT_DELAYS[1] }}>
          <circle className="ev-browse-site-svg__pulse" cx="132" cy="66" r="5" fill="currentColor" fillOpacity="0.2" style={{ animationDelay: PULSE_DELAYS[1] }} />
          <g transform="translate(132 34)">
            <path d="M-18 20 L0 -14 L18 20 Z" fill="currentColor" fillOpacity="0.45" />
            <rect x="-16" y="20" width="32" height="12" rx="1.5" fill="currentColor" />
          </g>
        </g>

        <g className="ev-browse-site-svg__icon" style={{ animationDelay: FLOAT_DELAYS[2] }}>
          <circle className="ev-browse-site-svg__pulse" cx="260" cy="66" r="5" fill="currentColor" fillOpacity="0.2" style={{ animationDelay: PULSE_DELAYS[2] }} />
          <g transform="translate(260 34)">
            <rect x="-14" y="-6" width="28" height="30" rx="2" fill="currentColor" />
            <path d="M-2 -14 h4v4h4v4h-4v4h-4v-4h-4v-4h4z" fill="var(--color-ev-bg)" fillOpacity="0.95" />
          </g>
        </g>

        <g className="ev-browse-site-svg__icon" style={{ animationDelay: FLOAT_DELAYS[3] }}>
          <circle className="ev-browse-site-svg__pulse" cx="388" cy="66" r="5" fill="currentColor" fillOpacity="0.2" style={{ animationDelay: PULSE_DELAYS[3] }} />
          <g transform="translate(388 34)">
            <path d="M-20 22 L0 -12 L20 22 Z" fill="currentColor" />
            <rect x="-14" y="22" width="28" height="14" rx="1.5" fill="currentColor" fillOpacity="0.72" />
          </g>
        </g>

        <g className="ev-browse-site-svg__icon" style={{ animationDelay: FLOAT_DELAYS[4] }}>
          <circle className="ev-browse-site-svg__pulse" cx="476" cy="66" r="5" fill="currentColor" fillOpacity="0.2" style={{ animationDelay: PULSE_DELAYS[4] }} />
          <g transform="translate(476 34)">
            <rect x="-14" y="-4" width="28" height="26" rx="1.5" fill="currentColor" />
            <rect x="10" y="-18" width="3" height="16" fill="currentColor" fillOpacity="0.55" />
            <path d="M13 -18 L22 -14 L13 -10 Z" fill="currentColor" fillOpacity="0.4" />
          </g>
        </g>
      </svg>
    </div>
  );
}
