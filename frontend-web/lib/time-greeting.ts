/**
 * Time-of-day greetings in **Asia/Kolkata (IST)** for dashboards (customer, dealer, admin, technician, superadmin).
 */

const IST = 'Asia/Kolkata';

function istHour(date: Date): number {
  const hourStr =
    new Intl.DateTimeFormat('en-IN', {
      timeZone: IST,
      hour: 'numeric',
      hour12: false,
    })
      .formatToParts(date)
      .find((p) => p.type === 'hour')?.value ?? '0';
  return parseInt(hourStr, 10);
}

/** IST buckets: early hours → "Good night" (same as dealer dashboard). */
export function greetingLabelIst(date: Date = new Date()): string {
  const h = istHour(date);
  if (h >= 4 && h < 12) return 'Good morning';
  if (h >= 12 && h < 17) return 'Good afternoon';
  if (h >= 17 && h < 21) return 'Good evening';
  return 'Good night';
}

function titleCaseFirstName(token: string): string {
  const t = token.trim();
  if (!t) return '';
  return t.charAt(0).toUpperCase() + t.slice(1).toLowerCase();
}

export type TimeGreetingOpts = {
  /** When no name: use "Good evening, there" instead of just "Good evening". */
  whenEmpty?: 'there' | 'omit';
};

/**
 * e.g. `Good evening, Rajkumar` (first word only, title-cased).
 * With no name and default opts: `Good evening`.
 */
export function personalizedTimeGreetingIst(
  displayName?: string | null,
  opts?: TimeGreetingOpts,
): string {
  const g = greetingLabelIst();
  const first = displayName?.trim().split(/\s+/)[0];
  if (first) return `${g}, ${titleCaseFirstName(first)}`;
  if (opts?.whenEmpty === 'there') return `${g}, there`;
  return g;
}

/** Same as {@link personalizedTimeGreetingIst} with a trailing wave emoji. */
export function personalizedTimeGreetingIstWithWave(
  displayName?: string | null,
  opts?: TimeGreetingOpts,
): string {
  return `${personalizedTimeGreetingIst(displayName, opts)} 👋`;
}
