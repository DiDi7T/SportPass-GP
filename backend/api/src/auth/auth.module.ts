import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { Session } from './entities/session.entity';
import { AccessGuard } from './guards/access.guard';
import { PermissionGuard } from './guards/permission.guard';
import { User } from '../users/entities/user.entity';
import { Athlete } from '../athletes/entities/athlete.entity';
import { LOCAL_JWT_ACCESS_SECRET } from './auth.constants';

@Module({
  imports: [TypeOrmModule.forFeature([User, Session, Athlete]), JwtModule.registerAsync({ imports: [ConfigModule], inject: [ConfigService], useFactory: (config: ConfigService) => ({ secret: config.get('JWT_ACCESS_SECRET', LOCAL_JWT_ACCESS_SECRET) }) })],
  controllers: [AuthController], providers: [AuthService, AccessGuard, PermissionGuard], exports: [AuthService, AccessGuard, PermissionGuard, JwtModule],
})
export class AuthModule {}
