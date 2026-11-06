import { Session } from '../auth/entities/session.entity';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { Team } from '../teams/entities/team.entity';
import { User } from '../users/entities/user.entity';
import { TeamCoachesController } from './team-coaches.controller';
import { TeamCoach } from './entities/team-coach.entity';
import { TeamCoachesService } from './team-coaches.service';

@Module({
  imports: [TypeOrmModule.forFeature([TeamCoach, Team, User, Session]), AuthModule],
  controllers: [TeamCoachesController],
  providers: [TeamCoachesService],
  exports: [TeamCoachesService],
})
export class TeamCoachesModule {}
