import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { TrainingAbsenceRequest } from '../training-absence-requests/entities/training-absence-request.entity';
import { Notification, NotificationType } from './entities/notification.entity';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification) private readonly notifications: Repository<Notification>,
    @InjectRepository(TrainingAbsenceRequest) private readonly requests: Repository<TrainingAbsenceRequest>,
  ) {}

  async findMine(userId: string) {
    const [items, unreadCount] = await Promise.all([
      this.notifications.find({
        where: { user: { id: userId } },
        relations: { request: true },
        order: { createdAt: 'DESC' },
      }),
      this.notifications.count({ where: { user: { id: userId }, readAt: IsNull() } }),
    ]);

    return {
      items: items.map(item => ({
        id: item.id,
        requestId: item.request.id,
        type: item.type,
        message: item.message,
        createdAt: item.createdAt,
        readAt: item.readAt,
      })),
      unreadCount,
    };
  }

  async markMineAsRead(userId: string, notificationId: string) {
    const notification = await this.notifications.findOne({
      where: { id: notificationId, user: { id: userId } },
      relations: { request: true },
    });
    if (!notification) throw new NotFoundException('Notificación no encontrada.');

    if (!notification.readAt) {
      notification.readAt = new Date();
      await this.notifications.save(notification);
    }

    return {
      id: notification.id,
      requestId: notification.request.id,
      type: notification.type,
      message: notification.message,
      createdAt: notification.createdAt,
      readAt: notification.readAt,
    };
  }

  // HU17/HU18 can call this after committing a decision or its email result.
  // The unique request_id makes retries idempotent; a later call refreshes the message.
  async recordDecision(requestId: string) {
    const request = await this.requests.findOne({
      where: { id: requestId },
      relations: { athlete: { user: true } },
    });
    if (!request) throw new NotFoundException('Solicitud no encontrada.');

    let type: NotificationType;
    let message: string;
    if (request.status === 'approved_by_coach') {
      type = 'request_approved';
      message = request.teacherEmailSentAt
        ? 'Tu solicitud fue avalada y el correo fue enviado al docente asignado.'
        : 'Tu solicitud fue avalada. El envío del correo al docente aún no está confirmado.';
    } else if (request.status === 'rejected_by_coach') {
      type = 'request_rejected';
      const reason = request.rejectionComment?.trim() || 'No se registró un motivo.';
      message = `Tu solicitud fue rechazada por el entrenador. Motivo: ${reason}`;
    } else {
      throw new ConflictException('Solo se puede notificar una solicitud aprobada o rechazada.');
    }

    await this.notifications.createQueryBuilder()
      .insert()
      .values({
        user: { id: request.athlete.user.id },
        request: { id: request.id },
        type,
        message,
      })
      .orUpdate(['type', 'message'], ['request_id'])
      .execute();
  }
}
