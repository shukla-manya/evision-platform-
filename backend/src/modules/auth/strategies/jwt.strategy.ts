import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import { DynamoService } from '../../../common/dynamo/dynamo.service';
import { getRequestClientIp, normalizeClientIp } from '../../../common/http/client-ip.util';
export interface JwtPayload {
  sub: string;
  role: string;
  email?: string;
  phone?: string;
  /** Superadmin single-session handle (rotated on each login). */
  sa_sess?: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly dynamo: DynamoService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get('JWT_SECRET'),
      passReqToCallback: true,
    });
  }

  async validate(req: Request, payload: JwtPayload) {
    if (!payload?.sub || !payload?.role) {
      throw new UnauthorizedException('Invalid token payload');
    }

    if (payload.role === 'superadmin') {
      const sess = typeof payload.sa_sess === 'string' ? payload.sa_sess.trim() : '';
      if (!sess) {
        throw new UnauthorizedException('Superadmin session expired. Sign in again.');
      }
      const row = await this.dynamo.get(this.dynamo.tableName('superadmin'), { id: 'SUPERADMIN' });
      const rec = row as Record<string, unknown> | null;
      const sid = String(rec?.active_session_id || '').trim();
      const storedIp = normalizeClientIp(String(rec?.active_session_ip || ''));
      const reqIp = normalizeClientIp(getRequestClientIp(req));
      if (!sid || sid !== sess || !storedIp || storedIp !== reqIp) {
        throw new UnauthorizedException(
          'Superadmin session is invalid, or you signed in from another device or network. Sign in again.',
        );
      }
    }

    return {
      id: payload.sub,
      role: payload.role,
      email: payload.email,
      phone: payload.phone,
    };
  }
}
