import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { Session } from '../auth/entities/session.entity';
import { Team } from '../teams/entities/team.entity';
import { CompetitionCancellationEffects } from './competition-cancellation.effects';
import { CompetitionsController } from './competitions.controller';
import { CompetitionsService } from './competitions.service';
import { Competition } from './entities/competition.entity';

@Module({ imports: [TypeOrmModule.forFeature([Competition, Team, Session]), AuthModule], controllers: [CompetitionsController], providers: [CompetitionsService, CompetitionCancellationEffects] })
export class CompetitionsModule {}
