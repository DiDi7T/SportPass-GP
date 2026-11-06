import {
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  Column,
} from 'typeorm';
import type { Relation } from 'typeorm';

import { Team } from '../../teams/entities/team.entity';
import { Athlete } from '../../athletes/entities/athlete.entity';

@Entity('team_athletes')
@Unique('uq_team_athlete', ['team', 'athlete'])
export class TeamAthlete {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Team, (team) => team.teamAthletes, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'team_id' })
  team!: Relation<Team>;

  @ManyToOne(() => Athlete, (athlete) => athlete.teamAthletes, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'athlete_id' })
  athlete!: Relation<Athlete>;

  @Column({ type: 'boolean', default: true })
  active!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}