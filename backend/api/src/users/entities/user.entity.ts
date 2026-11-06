import { Check, Column, CreateDateColumn, Entity, JoinTable, ManyToMany, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn,OneToOne } from 'typeorm';
import type { Relation } from 'typeorm';
import { Role } from '../../roles/entities/role.entity';
import { Session } from '../../auth/entities/session.entity';
import { Athlete } from '../../athletes/entities/athlete.entity';

@Entity('users')
@Check('users_icesi_email', `email = lower(email) AND email LIKE '%@icesi.edu.co'`)
export class User {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ type: 'varchar', length: 254, unique: true }) email!: string;
  @Column({ name: 'full_name', type: 'varchar', length: 160 }) fullName!: string;
  @Column({ name: 'document_number', type: 'varchar', length: 40, nullable: true }) documentNumber!: string | null;
  @Column({ name: 'password_hash', type: 'varchar', length: 255, select: false }) passwordHash!: string;
  @Column({ name: 'is_active', type: 'boolean', default: true }) isActive!: boolean;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt!: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' }) updatedAt!: Date;

  @ManyToMany(() => Role, role => role.users)
  @JoinTable({ name: 'user_roles', joinColumn: { name: 'user_id', referencedColumnName: 'id' }, inverseJoinColumn: { name: 'role_id', referencedColumnName: 'id' } })
  roles!: Role[];

  @OneToMany(() => Session, session => session.user) sessions!: Session[];

  @OneToOne(() => Athlete, (athlete) => athlete.user, { nullable: true })
  athlete!: Relation<Athlete> | null;
}
