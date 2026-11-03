import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { TeamAthlete } from './entities/team-athlete.entity';
import { Team } from '../teams/entities/team.entity';
import { Athlete } from '../athletes/entities/athlete.entity';

import { TeamAthletesController } from './team-athletes.controller';
import { TeamAthletesService } from './team-athletes.service';
import { AuthModule } from '../auth/auth.module';
import { Session } from '../auth/entities/session.entity';
import { AccessGuard } from '../auth/guards/access.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TeamAthlete,
      Team,
      Athlete,
      Session
    ]),
    AuthModule,
  ],
  controllers: [TeamAthletesController],
  providers: [TeamAthletesService,AccessGuard],
  exports: [TeamAthletesService],
})
export class TeamAthletesModule {}