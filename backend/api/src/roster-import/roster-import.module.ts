
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { RosterImportController } from './roster-import.controller';
import { RosterImportService } from './roster-import.service';

import { AuthModule } from '../auth/auth.module';
import { Session } from '../auth/entities/session.entity';

import { User } from '../users/entities/user.entity';
import { Team } from '../teams/entities/team.entity';
import { Athlete } from '../athletes/entities/athlete.entity';
import { TeamAthlete } from '../team-athletes/entities/team-athlete.entity';

import { AccessGuard } from '../auth/guards/access.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Session,
      User,
      Team,
      Athlete,
      TeamAthlete,
    ]),
    AuthModule,
  ],
  controllers: [RosterImportController],
  providers: [
    RosterImportService,
    AccessGuard,
  ],
  exports: [RosterImportService],
})
export class RosterImportModule {}
