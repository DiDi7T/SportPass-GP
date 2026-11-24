import { CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import type { Relation } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { TrainingAbsenceRequest } from './training-absence-request.entity';

@Entity('training_absence_request_coaches')
export class TrainingAbsenceRequestCoach {
  @PrimaryColumn({ name: 'request_id', type: 'uuid' })
  requestId!: string;

  @PrimaryColumn({ name: 'coach_id', type: 'uuid' })
  coachId!: string;

  @ManyToOne(() => TrainingAbsenceRequest, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'request_id' })
  request!: Relation<TrainingAbsenceRequest>;

  @ManyToOne(() => User, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'coach_id' })
  coach!: Relation<User>;

  @CreateDateColumn({ name: 'assigned_at', type: 'timestamptz' })
  assignedAt!: Date;
}
