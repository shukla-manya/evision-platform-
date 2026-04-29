import Cookies from 'js-cookie';

export const TOKEN_KEY = 'ev_token';
export const ROLE_KEY = 'ev_role';

export function saveToken(token: string, role: string) {
  Cookies.set(TOKEN_KEY, token, { expires: 7, sameSite: 'strict' });
  Cookies.set(ROLE_KEY, role, { expires: 7, sameSite: 'strict' });
}

export function getToken(): string | undefined {
  return Cookies.get(TOKEN_KEY);
}

export function getRole(): string | undefined {
  return Cookies.get(ROLE_KEY);
}

export function clearAuth() {
  Cookies.remove(TOKEN_KEY);
  Cookies.remove(ROLE_KEY);
}

export function isLoggedIn(): boolean {
  return !!Cookies.get(TOKEN_KEY);
}

/** Post-login landing: each role gets its dashboard; `/` stays the public marketing home for browsing anytime. */
export function redirectByRole(role: string): string {
  const routes: Record<string, string> = {
    superadmin: '/super/dashboard',
    admin: '/',
    customer: '/dashboard',
    dealer: '/dealer/dashboard',
    electrician: '/electrician/dashboard',
    electrician_pending: '/electrician/dashboard',
    electrician_rejected: '/electrician/dashboard',
  };
  return routes[role] || '/';
}

export function parseJwt(token: string): Record<string, unknown> | null {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const parsed: unknown = JSON.parse(atob(base64));
    return typeof parsed === 'object' && parsed !== null ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}
