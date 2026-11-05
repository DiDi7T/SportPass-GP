import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Team } from './entities/team.entity';
import { TeamsService } from './teams.service';
import { TeamsController } from './teams.controller';
import { User } from '../users/entities/user.entity';
import { Session } from '../auth/entities/session.entity';
import { AuthModule } from '../auth/auth.module';
import { AccessGuard } from '../auth/guards/access.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([Team, User, Session]),
    AuthModule,
  ],
  controllers: [TeamsController],
  providers: [TeamsService, AccessGuard],
  exports: [TeamsService],
})
export class TeamsModule {}