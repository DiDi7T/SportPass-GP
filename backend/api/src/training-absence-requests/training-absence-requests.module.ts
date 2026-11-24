import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Athlete } from '../athletes/entities/athlete.entity';
import { AuthModule } from '../auth/auth.module';
import { Session } from '../auth/entities/session.entity';
import { CompetitionCallup } from '../competitions/entities/competition-callup.entity';
import { TeamCoach } from '../team-coaches/entities/team-coach.entity';
import { User } from '../users/entities/user.entity';
import { TrainingAbsenceRequestCoach } from './entities/training-absence-request-coach.entity';
import { TrainingAbsenceRequest } from './entities/training-absence-request.entity';
import { TrainingAbsenceRequestsController } from './training-absence-requests.controller';
import { TrainingAbsenceRequestsService } from './training-absence-requests.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Athlete,
      Session,
      CompetitionCallup,
      TeamCoach,
      User,
      TrainingAbsenceRequest,
      TrainingAbsenceRequestCoach,
    ]),
    AuthModule,
  ],
  controllers: [TrainingAbsenceRequestsController],
  providers: [TrainingAbsenceRequestsService],
})
export class TrainingAbsenceRequestsModule {}
