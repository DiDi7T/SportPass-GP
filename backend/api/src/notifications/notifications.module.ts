import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { Session } from '../auth/entities/session.entity';
import { AccessGuard } from '../auth/guards/access.guard';
import { TrainingAbsenceRequest } from '../training-absence-requests/entities/training-absence-request.entity';
import { Notification } from './entities/notification.entity';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';

@Module({
  imports: [TypeOrmModule.forFeature([Notification, TrainingAbsenceRequest, Session]), AuthModule],
  controllers: [NotificationsController],
  providers: [NotificationsService, AccessGuard],
  exports: [NotificationsService],
})
export class NotificationsModule {}
