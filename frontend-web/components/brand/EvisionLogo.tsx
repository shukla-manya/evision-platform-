'use client';

import { useId } from 'react';

export type EvisionLogoTone = 'onDark' | 'onLight';

type Props = {
  className?: string;
  /** Horizontal lockup with wordmark, or icon-only mark */
  variant?: 'full' | 'mark';
  /** Word next to mark (default matches public brand) */
  wordmark?: string;
  /** Visual height in px; width scales from viewBox */
  height?: number;
  tone?: EvisionLogoTone;
};

/**
 * e vision brand mark: gradient tile + lens rings + optional wordmark.
 */
export function EvisionLogo({
  className,
  variant = 'full',
  wordmark = 'e vision',
  height = 36,
  tone = 'onDark',
}: Props) {
  const gid = `evlg-${useId().replace(/:/g, '')}`;
  const textFill = tone === 'onDark' ? '#ffffff' : '#1a1a2e';

  const mark = (
    <>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#1a1a2e" />
          <stop offset="55%" stopColor="#2c2c54" />
          <stop offset="100%" stopColor="#e8532a" />
        </linearGradient>
      </defs>
      <rect width="40" height="40" rx="10" fill={`url(#${gid})`} />
      <circle cx="20" cy="20" r="11" fill="none" stroke="white" strokeOpacity={0.22} strokeWidth={1.2} />
      <circle cx="20" cy="20" r="6.5" fill="none" stroke="white" strokeOpacity={0.45} strokeWidth={1.4} />
      <circle cx="20" cy="20" r={3} fill="white" />
    </>
  );

  if (variant === 'mark') {
    const s = height;
    return (
      <svg className={className} width={s} height={s} viewBox="0 0 40 40" aria-hidden>
        {mark}
      </svg>
    );
  }

  const vbW = 200;
  const vbH = 44;
  const w = (height / vbH) * vbW;
  return (
    <svg
      className={className}
      width={w}
      height={height}
      viewBox={`0 0 ${vbW} ${vbH}`}
      aria-label={wordmark}
      role="img"
    >
      <g transform="translate(0, 2)">{mark}</g>
      <text
        x={50}
        y={30}
        fill={textFill}
        fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
        fontSize={18}
        fontWeight={700}
        letterSpacing="-0.02em"
      >
        {wordmark}
      </text>
    </svg>
  );
}
