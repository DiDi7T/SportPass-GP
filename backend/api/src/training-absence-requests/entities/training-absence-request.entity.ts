import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import type { Relation } from 'typeorm';
import { Athlete } from '../../athletes/entities/athlete.entity';
import { Competition } from '../../competitions/entities/competition.entity';

export const PENDING_COACH_APPROVAL = 'pending_coach_approval';

@Entity('training_absence_requests')
@Check('training_absence_requests_valid_time', 'end_time > start_time')
export class TrainingAbsenceRequest {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Athlete, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'athlete_id' })
  athlete!: Relation<Athlete>;

  @ManyToOne(() => Competition, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'competition_id' })
  competition!: Relation<Competition>;

  @Column({ name: 'training_date', type: 'date' })
  trainingDate!: string;

  @Column({ name: 'start_time', type: 'time' })
  startTime!: string;

  @Column({ name: 'end_time', type: 'time' })
  endTime!: string;

  @Column({ name: 'subject_name', type: 'varchar', length: 200 })
  subjectName!: string;

  @Column({ name: 'teacher_name', type: 'varchar', length: 160 })
  teacherName!: string;

  @Column({ name: 'teacher_email', type: 'varchar', length: 254 })
  teacherEmail!: string;

  @Column({ type: 'varchar', length: 40, default: PENDING_COACH_APPROVAL })
  status!: string;

  @Column({ name: 'coach_responded_at', type: 'timestamptz', nullable: true })
  coachRespondedAt!: Date | null;

  @Column({ name: 'rejection_comment', type: 'varchar', length: 1000, nullable: true })
  rejectionComment!: string | null;

  @Column({ name: 'teacher_email_sent_at', type: 'timestamptz', nullable: true })
  teacherEmailSentAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
