import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Unique } from 'typeorm';
import { Participant } from './participant.entity';

// Una fila = el participante asistió al entrenamiento de su deporte ese día.
// uq_asistencia_diaria impide marcar dos veces el mismo día

@Entity('attendances')
@Unique('uq_asistencia_diaria', ['participant', 'sessionDate'])
export class Attendance {
  @PrimaryGeneratedColumn('uuid', { primaryKeyConstraintName: 'asistencias_pkey' }) id!: string;
  @Column({ name: 'participant_id', type: 'uuid' }) participantId!: string;
  @Column({ name: 'session_date', type: 'date' }) sessionDate!: string;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt!: Date;

  @ManyToOne(() => Participant, participant => participant.attendances, { nullable: false })
  @JoinColumn({ name: 'participant_id', foreignKeyConstraintName: 'fk_asistencia_participante' }) participant!: Participant;
}
