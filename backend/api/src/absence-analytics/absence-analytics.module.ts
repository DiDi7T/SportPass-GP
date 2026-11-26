
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthModule } from '../auth/auth.module';
import { TrainingAbsenceRequest } from '../training-absence-requests/entities/training-absence-request.entity';
import { TrainingAbsenceRequestCoach } from '../training-absence-requests/entities/training-absence-request-coach.entity';
import { Session } from '../auth/entities/session.entity';

import { AbsenceAnalyticsController } from './absence-analytics.controller';
import { AbsenceAnalyticsService } from './absence-analytics.service';

@Module({
  imports: [
  TypeOrmModule.forFeature([
    TrainingAbsenceRequest,
    TrainingAbsenceRequestCoach,
    Session,
  ]),
  AuthModule,
],
  controllers: [AbsenceAnalyticsController],
  providers: [AbsenceAnalyticsService],
})
export class AbsenceAnalyticsModule {}
