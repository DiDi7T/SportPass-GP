import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'node:crypto';
import { IsNull, MoreThan, Repository } from 'typeorm';
import { Session } from './entities/session.entity';
import { User } from '../users/entities/user.entity';

const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');
const publicUser = (user: User) => ({
  id: user.id,
  email: user.email,
  fullName: user.fullName,
  roles: (user.roles ?? []).map(role => role.name),
  permissions: [...new Set((user.roles ?? []).flatMap(role => (role.permissions ?? []).map(permission => permission.code)))],
});

@Injectable()
export class AuthService {
  private readonly dummyHash = bcrypt.hash('dummy-password-not-used-for-login', 12);
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Session) private readonly sessions: Repository<Session>,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  private findUserWithRoles(email: string) {
    return this.users.createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .leftJoinAndSelect('user.roles', 'role')
      .leftJoinAndSelect('role.permissions', 'permission')
      .where('user.email = :email', { email })
      .getOne();
  }

  private async accessToken(user: User, sessionId: string) {
    return this.jwt.signAsync({ sub: user.id, sid: sessionId, roles: (user.roles ?? []).map(role => role.name) }, {
      expiresIn: '15m',
    });
  }

  async login(emailInput: string, password: string, details: { userAgent?: string; ip?: string }) {
    const email = emailInput.trim().toLowerCase();
    if (!email.endsWith('@icesi.edu.co')) throw new UnauthorizedException('Credenciales inválidas.');
    const user = await this.findUserWithRoles(email);
    const hash = user?.passwordHash ?? await this.dummyHash;
    const valid = await bcrypt.compare(password, hash).catch(() => false);
    if (!user || !user.isActive || !valid) throw new UnauthorizedException('Credenciales inválidas.');

    const refreshToken = randomBytes(48).toString('base64url');
    const days = Number(this.config.get('REFRESH_TOKEN_DAYS', '14'));
    const session = this.sessions.create({
      userId: user.id,
      refreshTokenHash: hashToken(refreshToken),
      userAgent: details.userAgent?.slice(0, 500) ?? null,
      ipAddress: details.ip ?? null,
      expiresAt: new Date(Date.now() + days * 86400000),
    });
    await this.sessions.save(session);
    return { accessToken: await this.accessToken(user, session.id), refreshToken, user: publicUser(user) };
  }

  async refresh(rawToken?: string) {
    if (!rawToken) throw new UnauthorizedException('Sesión inválida.');
    const session = await this.sessions.findOne({
      where: { refreshTokenHash: hashToken(rawToken), revokedAt: IsNull(), expiresAt: MoreThan(new Date()) },
      relations: { user: { roles: { permissions: true } } },
    });
    if (!session || !session.user.isActive) throw new UnauthorizedException('Sesión inválida.');
    const newToken = randomBytes(48).toString('base64url');
    const result = await this.sessions.update(
      { id: session.id, refreshTokenHash: hashToken(rawToken), revokedAt: IsNull() },
      { refreshTokenHash: hashToken(newToken) },
    );
    if (result.affected !== 1) throw new UnauthorizedException('Sesión inválida.');
    return { accessToken: await this.accessToken(session.user, session.id), refreshToken: newToken };
  }

  async logout(rawToken?: string) {
    if (rawToken) await this.sessions.update({ refreshTokenHash: hashToken(rawToken), revokedAt: IsNull() }, { revokedAt: new Date() });
    return { success: true };
  }

  async me(userId: string) {
    const user = await this.users.findOne({ where: { id: userId, isActive: true }, relations: { roles: { permissions: true } } });
    if (!user) throw new UnauthorizedException();
    return publicUser(user);
  }

  async hasPermission(userId: string, code: string) {
    const user = await this.users.findOne({ where: { id: userId, isActive: true }, relations: { roles: { permissions: true } } });
    if (!user) throw new UnauthorizedException();
    return publicUser(user).permissions.includes(code);
  }
}
