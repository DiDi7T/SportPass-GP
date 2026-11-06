import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, Unique } from 'typeorm';

// Vinculación N:M. No reemplaza teams.coach_id (entrenador principal legado).
@Entity('team_coaches')
@Unique('uq_team_coaches_pair', ['teamId', 'coachId'])
export class TeamCoach {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Index() @Column({ name: 'team_id', type: 'uuid' }) teamId!: string;
  @Index() @Column({ name: 'coach_id', type: 'uuid' }) coachId!: string;
  @Column({ name: 'assigned_by', type: 'uuid', nullable: true }) assignedBy!: string | null;
  @CreateDateColumn({ name: 'assigned_at', type: 'timestamptz' }) assignedAt!: Date;
}
