import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn, Unique } from 'typeorm';
import { Participant } from '../../attendance/entities/participant.entity';


@Entity('sports')
@Unique('deporte_nombre_key', ['name'])
export class Sport {
  @PrimaryGeneratedColumn('uuid', { primaryKeyConstraintName: 'deporte_pkey' }) id!: string;
  @Column({ type: 'varchar' }) name!: string;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt!: Date;

  @OneToMany(() => Participant, participant => participant.sport) participants!: Participant[];
}
