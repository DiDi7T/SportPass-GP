import { jest } from '@jest/globals';
import { BadRequestException, ForbiddenException, RequestMethod } from '@nestjs/common';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { MyAbsenceRequestHistoryFiltersDto } from './dto/my-absence-request-history-filters.dto';
import { TrainingAbsenceRequestsController } from './training-absence-requests.controller';
import { TrainingAbsenceRequestsService } from './training-absence-requests.service';

// HU14 (SCRUM-26) – Consultar mi historial de solicitudes.
describe('TrainingAbsenceRequestsService.findHistory', () => {
  const athlete = { id: 'athlete-1', isActive: true, user: { isActive: true, roles: [{ name: 'athlete' }] } };
  const stored = {
    id: 'request-1',
    competition: { id: 'competition-1', name: 'Copa', team: { name: 'Baloncesto' } },
    trainingDate: '2026-11-20',
    startTime: '16:00:00',
    endTime: '18:00:00',
    subjectName: 'Matemáticas',
    teacherName: 'Docente Demo',
    teacherEmail: 'docente@icesi.edu.co',
    status: 'approved_by_coach',
    createdAt: new Date('2026-11-18T10:00:00Z'),
    coachRespondedAt: new Date('2026-11-19T10:00:00Z'),
    rejectionComment: null,
    teacherEmailSentAt: new Date('2026-11-19T10:01:00Z'),
  };

  const query: any = {};
  for (const method of ['innerJoin', 'innerJoinAndSelect', 'where', 'andWhere', 'orderBy', 'addOrderBy']) {
    query[method] = jest.fn(() => query);
  }
  query.getMany = jest.fn();
  const athletes: any = { findOne: jest.fn() };
  const dataSource: any = { getRepository: jest.fn(() => ({ createQueryBuilder: jest.fn(() => query) })) };
  let service: TrainingAbsenceRequestsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new TrainingAbsenceRequestsService(athletes, {} as any, {} as any, {} as any, dataSource);
    athletes.findOne.mockResolvedValue(athlete);
    query.getMany.mockResolvedValue([stored]);
  });

  it('only lists the authenticated athlete requests (CA1)', async () => {
    await service.findHistory('user-1');
    expect(athletes.findOne).toHaveBeenCalledWith(expect.objectContaining({ where: { user: { id: 'user-1' }, isActive: true } }));
    expect(query.where).toHaveBeenCalledWith('athlete.id = :athleteId', { athleteId: 'athlete-1' });
    expect(query.andWhere).not.toHaveBeenCalled();
  });

  it('filters by status, training date range and subject (CA1)', async () => {
    await service.findHistory('user-1', { status: 'rejected_by_coach', from: '2026-08-01', to: '2026-12-31', subject: '  Cálculo ' });
    expect(query.andWhere).toHaveBeenCalledWith('request.status = :status', { status: 'rejected_by_coach' });
    expect(query.andWhere).toHaveBeenCalledWith('request.trainingDate >= :from', { from: '2026-08-01' });
    expect(query.andWhere).toHaveBeenCalledWith('request.trainingDate <= :to', { to: '2026-12-31' });
    expect(query.andWhere).toHaveBeenCalledWith('LOWER(request.subjectName) LIKE :subject', { subject: '%cálculo%' });
  });

  it('treats % and _ typed in the subject as literal characters', async () => {
    await service.findHistory('user-1', { subject: '100%_real' });
    expect(query.andWhere).toHaveBeenCalledWith('LOWER(request.subjectName) LIKE :subject', { subject: '%100\\%\\_real%' });
  });

  it('ignores a blank subject', async () => {
    await service.findHistory('user-1', { subject: '   ' });
    expect(query.andWhere).not.toHaveBeenCalled();
  });

  it('orders from the most recent training to the oldest (CA2)', async () => {
    await service.findHistory('user-1');
    expect(query.orderBy).toHaveBeenCalledWith('request.trainingDate', 'DESC');
    expect(query.addOrderBy).toHaveBeenNthCalledWith(1, 'request.startTime', 'DESC');
    expect(query.addOrderBy).toHaveBeenNthCalledWith(2, 'request.createdAt', 'DESC');
  });

  it('returns what was sent to the teacher and the email traceability (CA3)', async () => {
    const [request] = await service.findHistory('user-1');
    expect(request).toMatchObject({
      id: 'request-1',
      competition: { name: 'Copa', teamName: 'Baloncesto' },
      trainingDate: '2026-11-20',
      startTime: '16:00',
      endTime: '18:00',
      subjectName: 'Matemáticas',
      teacherName: 'Docente Demo',
      teacherEmail: 'docente@icesi.edu.co',
      status: 'approved_by_coach',
      statusLabel: 'Aprobada por entrenador',
      coachRespondedAt: stored.coachRespondedAt,
      teacherEmailSentAt: stored.teacherEmailSentAt,
    });
  });

  it('rejects a date range where the start is after the end', async () => {
    await expect(service.findHistory('user-1', { from: '2026-12-01', to: '2026-11-01' })).rejects.toBeInstanceOf(BadRequestException);
    expect(query.getMany).not.toHaveBeenCalled();
  });

  it('is only available to an active athlete', async () => {
    athletes.findOne.mockResolvedValue(null);
    await expect(service.findHistory('coach-1')).rejects.toBeInstanceOf(ForbiddenException);
  });
});

describe('MyAbsenceRequestHistoryFiltersDto', () => {
  const errors = async (filters: object) =>
    (await validate(plainToInstance(MyAbsenceRequestHistoryFiltersDto, filters))).flatMap(error => Object.values(error.constraints ?? {}));

  it('accepts the four statuses, ISO dates and a subject', async () => {
    for (const status of ['pending_coach_approval', 'approved_by_coach', 'rejected_by_coach', 'cancelled']) {
      expect(await errors({ status, from: '2026-08-01', to: '2026-12-31', subject: 'Cálculo' })).toEqual([]);
    }
    expect(await errors({})).toEqual([]);
  });

  it('rejects an unknown status, a malformed date and a subject longer than 200 characters', async () => {
    expect(await errors({ status: 'aprobada' })).toEqual(['El estado seleccionado no es válido.']);
    expect(await errors({ from: '01/08/2026' })).toEqual(['La fecha debe tener el formato AAAA-MM-DD.']);
    expect(await errors({ subject: 'x'.repeat(201) })).toEqual(['La materia admite máximo 200 caracteres.']);
  });
});

describe('TrainingAbsenceRequestsController history route', () => {
  it('is a read-only GET /me/training-absence-requests/history declared before :id', () => {
    const handler = TrainingAbsenceRequestsController.prototype.findHistory;
    expect(Reflect.getMetadata(METHOD_METADATA, handler)).toBe(RequestMethod.GET);
    expect(Reflect.getMetadata(PATH_METADATA, handler)).toBe('history');
    const methods = Object.getOwnPropertyNames(TrainingAbsenceRequestsController.prototype);
    expect(methods.indexOf('findHistory')).toBeLessThan(methods.indexOf('findOneMine'));
  });
});
