import { Column, Entity, ManyToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Role } from '../../roles/entities/role.entity';

@Entity('permissions')
export class Permission {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ type: 'varchar', length: 100, unique: true }) code!: string;
  @Column({ type: 'varchar', length: 255, nullable: true }) description!: string | null;
  @ManyToMany(() => Role, role => role.permissions) roles!: Role[];
}
