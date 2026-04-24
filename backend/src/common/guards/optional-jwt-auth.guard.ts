import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

/** Attaches `req.user` when a valid Bearer token is present; otherwise leaves user unset. */
@Injectable()
export class OptionalJwtAuthGuard implements CanActivate {
  constructor(private jwt: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const header = req.headers?.authorization as string | undefined;
    if (!header?.startsWith('Bearer ')) return true;
    const token = header.slice(7).trim();
    if (!token) return true;
    try {
      const payload = this.jwt.verify<{ sub: string; role: string; email?: string; phone?: string }>(token);
      if (payload?.sub && payload?.role) {
        req.user = {
          id: payload.sub,
          role: payload.role,
          email: payload.email,
          phone: payload.phone,
        };
      }
    } catch {
      // Invalid or expired token — browse as guest
    }
    return true;
  }
}
