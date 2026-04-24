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

export function redirectByRole(role: string): string {
  const routes: Record<string, string> = {
    superadmin: '/superadmin/dashboard',
    admin: '/admin/dashboard',
    customer: '/shop',
    dealer: '/shop',
    electrician: '/electrician/dashboard',
  };
  return routes[role] || '/';
}

export function parseJwt(token: string): any {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(base64));
  } catch {
    return null;
  }
}
