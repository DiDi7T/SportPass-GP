import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { Session } from '../auth/entities/session.entity';
import { CompetitionCallup } from '../competitions/entities/competition-callup.entity';
import { TrainingAbsenceRequestCoach } from '../training-absence-requests/entities/training-absence-request-coach.entity';
import { TrainingAbsenceRequest } from '../training-absence-requests/entities/training-absence-request.entity';
import { User } from '../users/entities/user.entity';
import { AbsenceRequestReviewService } from './absence-request-review.service';
import { AdminAbsenceRequestsController } from './admin-absence-requests.controller';
import { TeacherAbsenceRequestsController } from './teacher-absence-requests.controller';

@Module({
  imports: [TypeOrmModule.forFeature([TrainingAbsenceRequest, TrainingAbsenceRequestCoach, CompetitionCallup, User, Session]), AuthModule],
  controllers: [TeacherAbsenceRequestsController, AdminAbsenceRequestsController],
  providers: [AbsenceRequestReviewService],
})
export class AbsenceRequestReviewModule {}
