import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MailModule } from '../mail/mail.module';
import { TrainingAbsenceRequest } from '../training-absence-requests/entities/training-absence-request.entity';
import { TeacherApprovalEmailService } from './teacher-approval-email.service';

@Module({
  imports: [TypeOrmModule.forFeature([TrainingAbsenceRequest]), MailModule],
  providers: [TeacherApprovalEmailService],
  exports: [TeacherApprovalEmailService],
})
export class TeacherNotificationsModule {}
