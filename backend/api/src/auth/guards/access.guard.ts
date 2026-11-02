import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import type { Request } from 'express';
import { IsNull, MoreThan, Repository } from 'typeorm';
import { Session } from '../entities/session.entity';
import { LOCAL_JWT_ACCESS_SECRET } from '../auth.constants';

@Injectable()
export class AccessGuard implements CanActivate {
  constructor(private readonly jwt: JwtService, private readonly config: ConfigService, @InjectRepository(Session) private readonly sessions: Repository<Session>) {}
  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<Request & { user?: any }>();
    const token = request.headers.authorization?.replace(/^Bearer\s+/i, '');
    if (!token) throw new UnauthorizedException();
    try {
      const claims = await this.jwt.verifyAsync(token, { secret: this.config.get<string>('JWT_ACCESS_SECRET', LOCAL_JWT_ACCESS_SECRET) });
      if (!claims.sub || !claims.sid) throw new Error('Invalid token claims');
      const session = await this.sessions.findOne({ where: { id: claims.sid, userId: claims.sub, revokedAt: IsNull(), expiresAt: MoreThan(new Date()), user: { isActive: true } } });
      if (!session) throw new Error('Inactive session');
      request.user = claims;
      return true;
    } catch { throw new UnauthorizedException(); }
  }
}
