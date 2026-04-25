import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/** Legacy `/superadmin/*` URLs redirect to private `/super/*` (not linked in the public app). */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (!pathname.startsWith('/superadmin')) return NextResponse.next();

  const rest = pathname.slice('/superadmin'.length) || '/';
  const mapped = rest === '/login' || rest === '/login/' ? '/signin' : rest;
  const url = request.nextUrl.clone();
  url.pathname = '/super' + (mapped.startsWith('/') ? mapped : `/${mapped}`);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ['/superadmin/:path*'],
};
