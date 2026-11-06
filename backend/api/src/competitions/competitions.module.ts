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

@Module({
  imports: [TypeOrmModule.forFeature([Competition, Team, Session, Athlete, TeamAthlete]), AuthModule, AttendanceModule],
  controllers: [CompetitionsController, MyCompetitionsController],
  providers: [CompetitionsService, CompetitionCancellationEffects, MyCompetitionsService],
})
export class CompetitionsModule {}
