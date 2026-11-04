import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { Session } from '../auth/entities/session.entity';
import { Competition } from '../competitions/entities/competition.entity';
import { TournamentsController } from './tournaments.controller';
import { TournamentsService } from './tournaments.service';

@Module({ imports: [TypeOrmModule.forFeature([Competition, Session]), AuthModule], controllers: [TournamentsController], providers: [TournamentsService] })
export class TournamentsModule {}