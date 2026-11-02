import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { Permission } from '../permissions/entities/permission.entity';
import { Role } from './entities/role.entity';
import { RolesController } from './roles.controller';
import { RolesService } from './roles.service';
import { Session } from '../auth/entities/session.entity';
import { AccessGuard } from '../auth/guards/access.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';

@Module({ imports: [TypeOrmModule.forFeature([Role, Permission, Session]), AuthModule], controllers: [RolesController], providers: [RolesService, AccessGuard, PermissionGuard] })
export class RolesModule {}
