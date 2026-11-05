import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { User } from '../../users/entities/user.entity';
import { TeamAthlete } from '../../team-athletes/entities/team-athlete.entity';


// Copia de la entidad Team de la rama feat/load-athletes (HU2), sin la relación
// teamAthletes. Debe mantenerse idéntica en columnas: todos usan la misma BD con
// synchronize y cualquier diferencia hace que TypeORM intente alterar la tabla.
// Al unir con esa rama, quedarse con su versión.
@Entity('teams')
export class Team {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', unique: true })
  name!: string;

  @Column({ type: 'varchar' })
  sport!: string;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'coach_id' })
  coach!: User | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @OneToMany(() => TeamAthlete, (teamAthlete) => teamAthlete.team)
  teamAthletes!: TeamAthlete[];
}
