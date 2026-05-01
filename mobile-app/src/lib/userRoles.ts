/**
 * Human-readable labels for API / JWT roles (matches frontend-web/lib/user-roles.ts).
 */
const ROLE_LABELS: Record<string, string> = {
  customer: 'Customer',
  dealer: 'Dealer',
  electrician: 'Technician',
  electrician_pending: 'Technician (pending)',
  electrician_rejected: 'Technician (rejected)',
  admin: 'Admin',
  superadmin: 'Superadmin',
};

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

export const PASSWORD_RESET_ROLE_OPTIONS: { value: 'admin'; label: string }[] = [{ value: 'admin', label: 'Shop admin' }];
