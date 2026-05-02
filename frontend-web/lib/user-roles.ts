/**
 * Human-readable labels for API / JWT roles. Backend keeps snake_case values
 * (e.g. electrician, electrician_pending); UI shows "Technician", etc.
 */
const ROLE_LABELS: Record<string, string> = {
  customer: 'Customer',
  dealer: 'Dealer',
  electrician: 'Technician',
  electrician_pending: 'Technician (pending)',
  electrician_rejected: 'Technician (rejected)',
  superadmin: 'Superadmin',
};

/** Bulleted line for marketing / register screens */
export const ACCOUNT_ROLES_SUMMARY = 'Customer · Dealer · Technician · Superadmin';

export function roleDisplayLabel(role: string | undefined | null): string {
  const key = String(role || '').toLowerCase().trim();
  if (!key) return '—';
  if (ROLE_LABELS[key]) return ROLE_LABELS[key];
  return key
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

/** Technicians reset password via email OTP (SMTP). */
export type PasswordResetApiRole = 'electrician';

export const PASSWORD_RESET_ROLE_OPTIONS: { value: PasswordResetApiRole; label: string }[] = [
  { value: 'electrician', label: 'Technician' },
];

/** Public self-serve registration tabs (technician = electrician in API). */
export const REGISTER_SELF_SERVE_TABS = [
  { key: 'customer' as const, label: 'Customer' },
  { key: 'dealer' as const, label: 'Dealer' },
  { key: 'technician' as const, label: 'Technician' },
];
