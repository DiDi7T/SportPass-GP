import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Sport } from '../sports/entities/sport.entity';
import { Attendance } from './entities/attendance.entity';
import { Participant } from './entities/participant.entity';

// Registra las tablas de asistencia (HU5 / HU9). Los servicios se agregan en los siguientes PRs.
@Module({ imports: [TypeOrmModule.forFeature([Sport, Participant, Attendance])], exports: [TypeOrmModule] })
export class AttendanceModule {}
