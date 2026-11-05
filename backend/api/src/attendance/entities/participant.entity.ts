import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn, Unique } from 'typeorm';
import { Athlete } from '../../athletes/entities/athlete.entity';
import { Sport } from '../../sports/entities/sport.entity';
import { Attendance } from './attendance.entity';

// un atleta oficial queda como participante de un deporte la primera vez que asiste.
//.
@Entity('participants')
@Unique('uq_athlete_deporte', ['athlete', 'sport'])
export class Participant {
  @PrimaryGeneratedColumn('uuid', { primaryKeyConstraintName: 'participantes_pkey' }) id!: string;
  @Column({ name: 'athlete_id', type: 'uuid' }) athleteId!: string;
  @Column({ name: 'sport_id', type: 'uuid' }) sportId!: string;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt!: Date;

  @ManyToOne(() => Athlete, { nullable: false })
  @JoinColumn({ name: 'athlete_id', foreignKeyConstraintName: 'fk_participante_athlete' }) athlete!: Athlete;

  @ManyToOne(() => Sport, sport => sport.participants, { nullable: false })
  @JoinColumn({ name: 'sport_id', foreignKeyConstraintName: 'fk_participante_deporte' }) sport!: Sport;

  @OneToMany(() => Attendance, attendance => attendance.participant) attendances!: Attendance[];
}
