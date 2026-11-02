import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Permission } from '../permissions/entities/permission.entity';
import { CreateRoleDto } from './dto/create-role.dto';
import { SetRolePermissionsDto } from './dto/set-role-permissions.dto';
import { Role } from './entities/role.entity';

@Injectable()
export class RolesService {
  constructor(@InjectRepository(Role) private readonly roles: Repository<Role>, @InjectRepository(Permission) private readonly permissions: Repository<Permission>) {}
  findAll() { return this.roles.find({ order: { name: 'ASC' }, relations: { permissions: true } }); }
  findPermissions() { return this.permissions.find({ order: { code: 'ASC' } }); }
  async create(dto: CreateRoleDto) { return this.roles.save(this.roles.create({ name: dto.name.trim().toLowerCase(), description: dto.description?.trim() ?? null })); }
  async setPermissions(id: string, dto: SetRolePermissionsDto) {
    const role = await this.roles.findOne({ where: { id }, relations: { permissions: true } });
    if (!role) throw new BadRequestException('Rol no encontrado.');
    const permissions = dto.codes.length ? await this.permissions.find({ where: { code: In(dto.codes) } }) : [];
    if (permissions.length !== dto.codes.length) throw new BadRequestException('Uno o más códigos de permiso no existen.');
    role.permissions = permissions;
    return this.roles.save(role);
  }
}
