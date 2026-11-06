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
import type { Relation } from 'typeorm';

import { User } from '../../users/entities/user.entity';
import { TeamAthlete } from '../../team-athletes/entities/team-athlete.entity';
import { Sport } from '../../sports/entities/sport.entity';


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

  // HU5/HU9: FK al catálogo `sports` (participantes y asistencia van por deporte).
  // `sport` (texto) se mantiene para no romper lo existente; el trigger
  // `trg_teams_sport_id` de la BD llena sport_id a partir de `sport` al crear o editar
  // un equipo, por eso TypeORM nunca escribe esta columna (insert/update: false).
  @Column({ name: 'sport_id', type: 'uuid', nullable: true, insert: false, update: false })
  sportId!: string | null;

  @ManyToOne(() => Sport, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'sport_id', foreignKeyConstraintName: 'fk_teams_sport' })
  sportRecord!: Relation<Sport> | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'coach_id' })
  coach!: Relation<User> | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @OneToMany(() => TeamAthlete, (teamAthlete) => teamAthlete.team)
  teamAthletes!: TeamAthlete[];
}
