import { Body, Controller, Get, Param, Put, UseGuards } from '@nestjs/common';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { AccessGuard } from '../auth/guards/access.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { UsersService } from './users.service';
import { SetUserRolesDto } from './dto/set-user-roles.dto';

@Controller('admin/users')
@UseGuards(AccessGuard, PermissionGuard)
@RequirePermission('users:read')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  findAll() {
    return this.users.findAll();
  }

  @Put(':id/roles')
  @RequirePermission('users:manage')
  setRoles(@Param('id') id: string, @Body() dto: SetUserRolesDto) {
    return this.users.setRoles(id, dto.roleIds);
  }
}
