import { Body, Controller, Get, Post, Req, Res, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { AccessGuard } from './guards/access.guard';

const COOKIE = 'sportpass_refresh';
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService, private readonly config: ConfigService) {}
  private cookieOptions() { return { httpOnly: true, secure: this.config.get('NODE_ENV') === 'production', sameSite: 'strict' as const, path: '/api/auth', maxAge: Number(this.config.get('REFRESH_TOKEN_DAYS', '14')) * 86400000 }; }

  @Post('login') @Throttle({ default: { limit: 5, ttl: 60000 } })
  async login(@Body() dto: LoginDto, @Req() request: Request, @Res({ passthrough: true }) response: Response) {
    const result = await this.auth.login(dto.email, dto.password, { userAgent: request.headers['user-agent'], ip: request.ip });
    response.cookie(COOKIE, result.refreshToken, this.cookieOptions());
    return { accessToken: result.accessToken, user: result.user };
  }

  @Post('refresh') async refresh(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    const result = await this.auth.refresh(request.cookies?.[COOKIE]);
    response.cookie(COOKIE, result.refreshToken, this.cookieOptions());
    return { accessToken: result.accessToken };
  }

  @Post('logout') async logout(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    await this.auth.logout(request.cookies?.[COOKIE]);
    response.clearCookie(COOKIE, this.cookieOptions());
    return { success: true };
  }

  @Get('me') @UseGuards(AccessGuard) me(@Req() request: Request & { user: { sub: string } }) { return this.auth.me(request.user.sub); }
}
