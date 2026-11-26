import { jest } from '@jest/globals';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { NotificationsService } from './notifications.service';

describe('NotificationsService', () => {
  const notifications: any = {
    find: jest.fn(),
    count: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
    createQueryBuilder: jest.fn(),
  };
  const requests: any = { findOne: jest.fn() };
  const query = {
    insert: jest.fn(),
    values: jest.fn(),
    orUpdate: jest.fn(),
    execute: jest.fn(),
  };
  let service: NotificationsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new NotificationsService(notifications, requests);
    query.insert.mockReturnThis();
    query.values.mockReturnThis();
    query.orUpdate.mockReturnThis();
    notifications.createQueryBuilder.mockReturnValue(query);
    query.execute.mockResolvedValue({});
  });

  it('lists only the current user notifications and returns their unread count', async () => {
    const createdAt = new Date('2026-11-25T15:00:00.000Z');
    notifications.find.mockResolvedValue([{
      id: 'notification-1',
      request: { id: 'request-1' },
      type: 'request_rejected',
      message: 'Motivo: entrenamiento cancelado',
      createdAt,
      readAt: null,
    }]);
    notifications.count.mockResolvedValue(1);

    await expect(service.findMine('athlete-user')).resolves.toEqual({
      items: [{
        id: 'notification-1',
        requestId: 'request-1',
        type: 'request_rejected',
        message: 'Motivo: entrenamiento cancelado',
        createdAt,
        readAt: null,
      }],
      unreadCount: 1,
    });
    expect(notifications.find).toHaveBeenCalledWith(expect.objectContaining({
      where: { user: { id: 'athlete-user' } },
      order: { createdAt: 'DESC' },
    }));
    expect(notifications.count).toHaveBeenCalledWith({
      where: { user: { id: 'athlete-user' }, readAt: expect.anything() },
    });
  });

  it('marks an owned notification as read and is idempotent', async () => {
    const notification = {
      id: 'notification-1',
      request: { id: 'request-1' },
      type: 'request_approved',
      message: 'Aprobada',
      createdAt: new Date('2026-11-25T15:00:00.000Z'),
      readAt: null as Date | null,
    };
    notifications.findOne.mockResolvedValue(notification);
    notifications.save.mockImplementation(async (value: unknown) => value);

    const result = await service.markMineAsRead('athlete-user', 'notification-1');

    expect(result).toMatchObject({ id: 'notification-1', requestId: 'request-1' });
    expect(result.readAt).toBeInstanceOf(Date);
    expect(notifications.findOne).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'notification-1', user: { id: 'athlete-user' } },
    }));
    expect(notifications.save).toHaveBeenCalledTimes(1);

    notification.readAt = result.readAt;
    await service.markMineAsRead('athlete-user', 'notification-1');
    expect(notifications.save).toHaveBeenCalledTimes(1);
  });

  it('does not allow a user to read another user notification', async () => {
    notifications.findOne.mockResolvedValue(null);

    await expect(service.markMineAsRead('athlete-a', 'notification-owned-by-b'))
      .rejects.toBeInstanceOf(NotFoundException);
    expect(notifications.save).not.toHaveBeenCalled();
  });

  it('records a rejection notification with the coach reason and an idempotent request key', async () => {
    requests.findOne.mockResolvedValue({
      id: 'request-1',
      status: 'rejected_by_coach',
      rejectionComment: '  Entrenamiento cancelado  ',
      athlete: { user: { id: 'athlete-user' } },
    });

    await service.recordDecision('request-1');

    expect(query.values).toHaveBeenCalledWith(expect.objectContaining({
      user: { id: 'athlete-user' },
      request: { id: 'request-1' },
      type: 'request_rejected',
      message: 'Tu solicitud fue rechazada por el entrenador. Motivo: Entrenamiento cancelado',
    }));
    expect(query.orUpdate).toHaveBeenCalledWith(['type', 'message'], ['request_id']);
  });

  it('records whether teacher email delivery is confirmed for an approval', async () => {
    requests.findOne.mockResolvedValue({
      id: 'request-2',
      status: 'approved_by_coach',
      teacherEmailSentAt: new Date('2026-11-25T15:00:00.000Z'),
      athlete: { user: { id: 'athlete-user' } },
    });

    await service.recordDecision('request-2');

    expect(query.values).toHaveBeenCalledWith(expect.objectContaining({
      type: 'request_approved',
      message: 'Tu solicitud fue avalada y el correo fue enviado al docente asignado.',
    }));
  });

  it('rejects missing requests and requests without a final decision', async () => {
    requests.findOne.mockResolvedValue(null);
    await expect(service.recordDecision('missing')).rejects.toBeInstanceOf(NotFoundException);

    requests.findOne.mockResolvedValue({ id: 'request-3', status: 'pending_coach_approval' });
    await expect(service.recordDecision('request-3')).rejects.toBeInstanceOf(ConflictException);
  });
});
