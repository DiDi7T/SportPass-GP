import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Athlete } from '../athletes/entities/athlete.entity';
import { AttendanceModule } from '../attendance/attendance.module';
import { AuthModule } from '../auth/auth.module';
import { Session } from '../auth/entities/session.entity';
import { TeamAthlete } from '../team-athletes/entities/team-athlete.entity';
import { Team } from '../teams/entities/team.entity';
import { CompetitionCancellationEffects } from './competition-cancellation.effects';
import { CompetitionsController } from './competitions.controller';
import { CompetitionsService } from './competitions.service';
import { Competition } from './entities/competition.entity';
import { MyCompetitionsController } from './my-competitions.controller';
import { MyCompetitionsService } from './my-competitions.service';
import { TeamCoachesModule } from '../team-coaches/team-coaches.module';
import { AcademicConflictsController } from './academic-conflicts.controller';
import { AcademicConflictsService } from './academic-conflicts.service';

@Module({
  imports: [TypeOrmModule.forFeature([Competition, Team, Session, Athlete, TeamAthlete]), AuthModule, AttendanceModule, TeamCoachesModule],
  controllers: [CompetitionsController, MyCompetitionsController, AcademicConflictsController],
  providers: [CompetitionsService, CompetitionCancellationEffects, MyCompetitionsService, AcademicConflictsService],
})
export class CompetitionsModule {}
