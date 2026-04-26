import type { Request } from 'express';

/** Best-effort client IP (uses X-Forwarded-For when present — enable trust proxy in production). */
export function getRequestClientIp(req: Request): string {
  const xf = req.headers['x-forwarded-for'];
  if (typeof xf === 'string' && xf.length) {
    return xf.split(',')[0].trim();
  }
  if (Array.isArray(xf) && xf.length && typeof xf[0] === 'string') {
    return String(xf[0]).split(',')[0].trim();
  }
  const raw = req.ip || req.socket?.remoteAddress || '';
  return typeof raw === 'string' ? raw : '';
}

/** Normalize IPv4-mapped and loopback forms so login and later requests match. */
export function normalizeClientIp(ip: string): string {
  let v = String(ip || '').trim();
  if (v.startsWith('::ffff:')) v = v.slice(7);
  if (v === '::1') v = '127.0.0.1';
  return v;
}
