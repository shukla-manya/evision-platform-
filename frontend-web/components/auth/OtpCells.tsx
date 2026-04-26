'use client';

import { useCallback, useEffect, useRef } from 'react';

type OtpCellsProps = {
  cells: string[];
  onCellsChange: (next: string[]) => void;
  disabled?: boolean;
  /** Change when remounting focus to first cell (e.g. step or resend). */
  autoFocusKey?: string | number;
};

export function OtpCells({ cells, onCellsChange, disabled, autoFocusKey = 0 }: OtpCellsProps) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  const setAt = useCallback(
    (index: number, digit: string) => {
      const d = digit.replace(/\D/g, '').slice(-1);
      const next = [...cells];
      next[index] = d;
      onCellsChange(next);
    },
    [cells, onCellsChange],
  );

  useEffect(() => {
    refs.current[0]?.focus();
  }, [autoFocusKey]);

  return (
    <div className="flex justify-center gap-2 sm:gap-3" role="group" aria-label="One-time password">
      {Array.from({ length: 6 }, (_, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          type="text"
          inputMode="numeric"
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          maxLength={1}
          disabled={disabled}
          className="w-10 h-12 sm:w-11 sm:h-14 text-center text-lg font-semibold rounded-xl border border-ev-border bg-ev-surface2 text-ev-text
                     focus:outline-none focus:ring-2 focus:ring-ev-primary/40 focus:border-ev-primary transition-shadow"
          value={cells[i] ?? ''}
          onChange={(e) => {
            const raw = e.target.value.replace(/\D/g, '');
            if (raw.length > 1) {
              const filled = raw.slice(0, 6).split('');
              const next = Array.from({ length: 6 }, (_, j) => filled[j] ?? '');
              onCellsChange(next);
              refs.current[Math.min(5, filled.length)]?.focus();
              return;
            }
            setAt(i, raw);
            if (raw && i < 5) refs.current[i + 1]?.focus();
          }}
          onKeyDown={(e) => {
            if (e.key === 'Backspace') {
              if (cells[i]) {
                setAt(i, '');
              } else if (i > 0) {
                refs.current[i - 1]?.focus();
                setAt(i - 1, '');
              }
            }
          }}
          onFocus={(e) => e.target.select()}
        />
      ))}
    </div>
  );
}
