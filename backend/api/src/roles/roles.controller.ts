import { Body, Controller, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { AccessGuard } from '../auth/guards/access.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { CreateRoleDto } from './dto/create-role.dto';
import { SetRolePermissionsDto } from './dto/set-role-permissions.dto';
import { RolesService } from './roles.service';

@Controller('admin') @UseGuards(AccessGuard, PermissionGuard) @RequirePermission('roles:manage')
export class RolesController {
  constructor(private readonly roles: RolesService) {}
  @Get('roles') findAll() { return this.roles.findAll(); }
  @Get('permissions') findPermissions() { return this.roles.findPermissions(); }
  @Post('roles') create(@Body() dto: CreateRoleDto) { return this.roles.create(dto); }
  @Put('roles/:id/permissions') setPermissions(@Param('id') id: string, @Body() dto: SetRolePermissionsDto) { return this.roles.setPermissions(id, dto); }
}
