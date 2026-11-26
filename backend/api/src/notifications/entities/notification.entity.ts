import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import type { Relation } from 'typeorm';
import { TrainingAbsenceRequest } from '../../training-absence-requests/entities/training-absence-request.entity';
import { User } from '../../users/entities/user.entity';

export type NotificationType = 'request_approved' | 'request_rejected';

@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => User, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: Relation<User>;

  @ManyToOne(() => TrainingAbsenceRequest, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'request_id' })
  request!: Relation<TrainingAbsenceRequest>;

  @Column({ type: 'varchar', length: 32 })
  type!: NotificationType;

  @Column({ type: 'text' })
  message!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @Column({ name: 'read_at', type: 'timestamptz', nullable: true })
  readAt!: Date | null;
}
