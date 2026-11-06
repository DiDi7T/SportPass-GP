import {
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';

import { Competition } from './competition.entity';
import { Athlete } from '../../athletes/entities/athlete.entity';

@Entity('competition_callups')
@Unique('uq_competition_callup', ['competition', 'athlete'])
export class CompetitionCallup {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Competition, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'competition_id' })
  competition!: Competition;

  @ManyToOne(() => Athlete, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'athlete_id' })
  athlete!: Athlete;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}