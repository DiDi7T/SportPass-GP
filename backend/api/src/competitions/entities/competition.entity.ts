import { Check, Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Team } from '../../teams/entities/team.entity';
import { User } from '../../users/entities/user.entity';

export const COMPETITION_TYPES = ['local', 'regional', 'nacional'] as const;
export type CompetitionType = (typeof COMPETITION_TYPES)[number];

@Entity('competitions')
@Check('competitions_type', `type IN ('local', 'regional', 'nacional')`)
@Check('competitions_end_after_start', `(end_date + end_time) > (start_date + start_time)`)
export class Competition {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ type: 'varchar', length: 160 }) name!: string;
  @Index() @Column({ name: 'team_id', type: 'uuid' }) teamId!: string;
  @Column({ name: 'start_date', type: 'date' }) startDate!: string;
  @Column({ name: 'end_date', type: 'date' }) endDate!: string;
  @Column({ name: 'start_time', type: 'time' }) startTime!: string;
  @Column({ name: 'end_time', type: 'time' }) endTime!: string;
  @Column({ type: 'varchar', length: 200 }) location!: string;
  @Column({ type: 'varchar', length: 20 }) type!: CompetitionType;
  @Column({ name: 'created_by', type: 'uuid' }) createdById!: string;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt!: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' }) updatedAt!: Date;

  @ManyToOne(() => Team, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'team_id' }) team!: Team;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'created_by' }) createdBy!: User;
}
