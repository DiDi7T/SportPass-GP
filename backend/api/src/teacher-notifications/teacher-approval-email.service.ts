import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MailService } from '../mail/mail.service';
import { TrainingAbsenceRequest } from '../training-absence-requests/entities/training-absence-request.entity';
import { buildTrainingAbsencePermitPdf, toPermitPdfData } from '../training-absence-requests/training-absence-request-pdf';
import { composeTeacherApprovalEmail } from './teacher-approval-email';

export type TeacherEmailResult = 'sent' | 'failed' | 'skipped';

// HU18: correo al docente cuando el entrenador aprueba la solicitud (lo invoca HU17).
// Nunca lanza: si el envío falla, la solicitud sigue aprobada y el error queda registrado (CA4).
@Injectable()
export class TeacherApprovalEmailService {
  private readonly logger = new Logger(TeacherApprovalEmailService.name);

  constructor(
    @InjectRepository(TrainingAbsenceRequest) private readonly requests: Repository<TrainingAbsenceRequest>,
    private readonly mail: MailService,
  ) {}

  async notifyTeacherOfApproval(requestId: string): Promise<TeacherEmailResult> {
    const request = await this.requests.findOne({
      where: { id: requestId },
      relations: { athlete: { user: true }, competition: { team: true }, respondedByCoach: true },
    });
    // CA1: solo solicitudes aprobadas, y una sola vez.
    if (!request || request.status !== 'approved_by_coach' || request.teacherEmailSentAt) return 'skipped';

    try {
      if (!request.respondedByCoach || !request.coachRespondedAt) {
        throw new Error('La solicitud no tiene registrado el entrenador que la aprobó.');
      }
      const data = toPermitPdfData({ ...request, respondedByCoach: request.respondedByCoach, coachRespondedAt: request.coachRespondedAt });
      const pdf = await buildTrainingAbsencePermitPdf(data);
      // CA2: al correo del docente registrado en la solicitud, con copia al deportista. CA3: datos y PDF adjunto.
      await this.mail.send({
        to: request.teacherEmail,
        cc: request.athlete.user.email,
        ...composeTeacherApprovalEmail(data),
        attachments: [{ filename: `constancia-sportpass-${request.id}.pdf`, content: pdf, contentType: 'application/pdf' }],
      });
      const sentAt = new Date();
      // Llenar teacher_email_sent_at también actualiza la notificación del deportista (trigger de HU19).
      await this.requests.update(
        { id: request.id },
        { teacherEmailStatus: 'sent', teacherEmailError: null, teacherEmailAttemptedAt: sentAt, teacherEmailSentAt: sentAt },
      );
      this.logger.log(`Correo al docente enviado para la solicitud ${request.id}.`);
      return 'sent';
    } catch (error) {
      const message = (error instanceof Error ? error.message : String(error)) || 'Error desconocido al enviar el correo.';
      this.logger.error(`No se pudo enviar el correo al docente de la solicitud ${request.id}: ${message}`);
      await this.requests
        .update({ id: request.id }, { teacherEmailStatus: 'failed', teacherEmailError: message.slice(0, 1000), teacherEmailAttemptedAt: new Date() })
        .catch(updateError => this.logger.error(`No se pudo registrar el fallo del correo: ${updateError}`));
      return 'failed';
    }
  }
}
