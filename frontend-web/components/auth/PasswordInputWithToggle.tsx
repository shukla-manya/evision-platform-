'use client';

import { useState } from 'react';
import { Eye, EyeOff, Lock } from 'lucide-react';

export type PasswordInputWithToggleProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  /** When true, shows a lock icon on the left like other admin auth fields. */
  withLeadingLock?: boolean;
};

export function PasswordInputWithToggle({
  withLeadingLock = true,
  className = '',
  disabled,
  ...rest
}: PasswordInputWithToggleProps) {
  const [visible, setVisible] = useState(false);
  const pad = withLeadingLock ? 'pl-10 pr-11' : 'pr-11';

  return (
    <div className="relative">
      {withLeadingLock ? (
        <Lock size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ev-subtle" aria-hidden />
      ) : null}
      <input
        type={visible ? 'text' : 'password'}
        className={`ev-input ${pad} ${className}`.trim()}
        disabled={disabled}
        {...rest}
      />
      <button
        type="button"
        className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-ev-subtle hover:text-ev-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ev-primary/40 disabled:pointer-events-none disabled:opacity-50"
        onClick={() => setVisible((v) => !v)}
        disabled={disabled}
        aria-label={visible ? 'Hide password' : 'Show password'}
        aria-pressed={visible}
      >
        {visible ? <EyeOff size={18} strokeWidth={1.75} /> : <Eye size={18} strokeWidth={1.75} />}
      </button>
    </div>
  );
}
