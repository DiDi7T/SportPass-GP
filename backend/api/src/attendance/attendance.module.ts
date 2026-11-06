import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Athlete } from '../athletes/entities/athlete.entity';
import { AuthModule } from '../auth/auth.module';
import { Session } from '../auth/entities/session.entity';
import { Sport } from '../sports/entities/sport.entity';
import { Team } from '../teams/entities/team.entity';
import { TeamCoachesModule } from '../team-coaches/team-coaches.module';
import { User } from '../users/entities/user.entity';
import { AttendanceRegistrationService } from './attendance-registration.service';
import { AttendanceController } from './attendance.controller';
import { AttendanceService } from './attendance.service';
import { Attendance } from './entities/attendance.entity';
import { Participant } from './entities/participant.entity';

// Asistencia a entrenamientos.
// - AttendanceService: % de asistencia por deporte (HU5).
// - AttendanceRegistrationService + AttendanceController: registro por el entrenador (HU9).
@Module({
  imports: [TypeOrmModule.forFeature([Sport, Participant, Attendance, Team, User, Athlete, Session]), AuthModule, TeamCoachesModule],
  controllers: [AttendanceController],
  providers: [AttendanceService, AttendanceRegistrationService],
  exports: [TypeOrmModule, AttendanceService],
})
export class AttendanceModule {}
