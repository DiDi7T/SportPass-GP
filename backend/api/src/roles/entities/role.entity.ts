import { Column, Entity, JoinTable, ManyToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Permission } from '../../permissions/entities/permission.entity';
import { User } from '../../users/entities/user.entity';

@Entity('roles')
export class Role {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ type: 'varchar', length: 60, unique: true }) name!: string;
  @Column({ type: 'varchar', length: 255, nullable: true }) description!: string | null;
  @ManyToMany(() => User, user => user.roles) users!: User[];
  @ManyToMany(() => Permission, permission => permission.roles)
  @JoinTable({ name: 'role_permissions', joinColumn: { name: 'role_id', referencedColumnName: 'id' }, inverseJoinColumn: { name: 'permission_id', referencedColumnName: 'id' } })
  permissions!: Permission[];
}
