import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Role } from '../roles/entities/role.entity';
import { User } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Role) private readonly roles: Repository<Role>,
  ) {}
  async findAll() {
    const users = await this.users.find({
      order: { fullName: 'ASC' },
      relations: { roles: true },
    });
    return users.map(({ passwordHash: _hidden, ...user }) => user);
  }

  async findById(id: string) {
    const user = await this.users.findOne({
      where: { id },
      relations: { roles: true },
    });
    if (!user) throw new NotFoundException('Usuario no encontrado.');
    const { passwordHash: _hidden, ...safeUser } = user;
    return safeUser;
  }

  async setRoles(userId: string, roleIds: string[]) {
    const user = await this.users.findOne({
      where: { id: userId },
      relations: { roles: true },
    });
    if (!user) throw new NotFoundException('Usuario no encontrado.');

    const roles = roleIds.length
      ? await this.roles.find({ where: { id: In(roleIds) } })
      : [];
    if (roles.length !== roleIds.length) {
      throw new BadRequestException(
        'Uno o más roles seleccionados no existen.',
      );
    }

    user.roles = roles;
    const updatedUser = await this.users.save(user);
    const { passwordHash: _hidden, ...safeUser } = updatedUser;
    return safeUser;
  }
}
