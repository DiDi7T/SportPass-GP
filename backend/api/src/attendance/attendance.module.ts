import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Sport } from '../sports/entities/sport.entity';
import { AttendanceService } from './attendance.service';
import { Attendance } from './entities/attendance.entity';
import { Participant } from './entities/participant.entity';

// Tablas de asistencia (HU5 / HU9). AttendanceService calcula el % de asistencia por deporte.
@Module({
  imports: [TypeOrmModule.forFeature([Sport, Participant, Attendance])],
  providers: [AttendanceService],
  exports: [TypeOrmModule, AttendanceService],
})
export class AttendanceModule {}
