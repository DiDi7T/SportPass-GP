import { jest } from '@jest/globals';
import { ForbiddenException } from '@nestjs/common';
import { validate } from 'class-validator';
import { CreateTrainingAbsenceRequestDto } from './dto/create-training-absence-request.dto';
import {
  PENDING_COACH_APPROVAL,
  TrainingAbsenceRequest,
} from './entities/training-absence-request.entity';
import { TrainingAbsenceRequestsService } from './training-absence-requests.service';

describe('TrainingAbsenceRequestsService', () => {
  const athlete = {
    id: 'athlete-1',
    isActive: true,
    user: { isActive: true, roles: [{ name: 'athlete' }] },
  };
  const competition = {
    id: 'competition-1',
    name: 'Copa',
    status: 'programada',
    startDate: '2099-05-10',
    endDate: '2099-05-10',
    startTime: '08:00:00',
    endTime: '12:00:00',
    teamId: 'team-1',
    team: {
      id: 'team-1',
      name: 'Baloncesto',
      sport: 'Baloncesto',
      isActive: true,
      coach: { id: 'coach-1' },
    },
  };
  const callup = { athlete, competition, createdAt: new Date('2026-01-01') };
  const dto = {
    competitionId: competition.id,
    trainingDate: '2099-05-08',
    startTime: '16:00',
    endTime: '18:00',
    subjectName: 'Matemáticas',
    teacherName: 'Docente Demo',
    teacherEmail: 'DOCENTE@ICESI.EDU.CO',
  };

  const athletes: any = { findOne: jest.fn() };
  const callups: any = { find: jest.fn() };
  const teamCoaches: any = { find: jest.fn() };
  const users: any = { find: jest.fn() };
  const requestRepository: any = { create: jest.fn((value: any) => value), save: jest.fn() };
  const requestCoachesRepository: any = { insert: jest.fn() };
  const manager: any = {
    getRepository: jest.fn((entity: unknown) =>
      entity === TrainingAbsenceRequest ? requestRepository : requestCoachesRepository),
  };
  const dataSource: any = {
    transaction: jest.fn((work: (value: unknown) => Promise<unknown>) => work(manager)),
  };
  let service: TrainingAbsenceRequestsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new TrainingAbsenceRequestsService(
      athletes,
      callups,
      teamCoaches,
      users,
      dataSource,
    );
    athletes.findOne.mockResolvedValue(athlete);
    callups.find.mockResolvedValue([callup]);
    teamCoaches.find.mockResolvedValue([{ coachId: 'coach-1' }, { coachId: 'coach-2' }]);
    users.find.mockResolvedValue([
      { id: 'coach-1', fullName: 'Entrenador Uno', roles: [{ name: 'coach' }] },
      { id: 'coach-2', fullName: 'Entrenadora Dos', roles: [{ name: 'coach' }] },
    ]);
    requestRepository.save.mockImplementation(async (value: any) => ({
      ...value,
      id: 'request-1',
      createdAt: new Date('2026-11-24T12:00:00.000Z'),
    }));
  });

  it('lists only future, active competitions with an athlete callup', async () => {
    callups.find.mockResolvedValue([
      callup,
      { ...callup, competition: { ...competition, id: 'cancelled', status: 'cancelada' } },
      { ...callup, competition: { ...competition, id: 'inactive-team', team: { ...competition.team, isActive: false } } },
      { ...callup, competition: { ...competition, id: 'ended', endDate: '2020-05-10' } },
    ]);

    await expect(service.findEligibleCompetitions('athlete-user', new Date('2026-11-24')))
      .resolves.toEqual([{
        id: competition.id,
        name: competition.name,
        team: { id: 'team-1', name: 'Baloncesto', sport: 'Baloncesto' },
        startDate: competition.startDate,
        endDate: competition.endDate,
        startTime: '08:00',
        endTime: '12:00',
      }]);
  });

  it('creates a pending request and associates all assigned active coaches', async () => {
    const result = await service.create('athlete-user', dto, new Date('2026-11-24'));

    expect(result).toMatchObject({
      id: 'request-1',
      status: PENDING_COACH_APPROVAL,
      statusLabel: 'Pendiente de aprobación del entrenador',
      teacherEmail: 'docente@icesi.edu.co',
      coaches: [
        { id: 'coach-1', fullName: 'Entrenador Uno' },
        { id: 'coach-2', fullName: 'Entrenadora Dos' },
      ],
    });
    expect(requestRepository.create).toHaveBeenCalledWith(expect.objectContaining({
      athlete: { id: 'athlete-1' },
      competition: { id: 'competition-1' },
      status: PENDING_COACH_APPROVAL,
      subjectName: 'Matemáticas',
    }));
    expect(requestCoachesRepository.insert).toHaveBeenCalledWith([
      { requestId: 'request-1', coachId: 'coach-1' },
      { requestId: 'request-1', coachId: 'coach-2' },
    ]);
  });

  it('rejects submissions without an active callup or with an external teacher email', async () => {
    callups.find.mockResolvedValue([]);
    await expect(service.create('athlete-user', dto, new Date('2026-11-24')))
      .rejects.toBeInstanceOf(ForbiddenException);

    callups.find.mockResolvedValue([callup]);
    await expect(service.create('athlete-user', { ...dto, teacherEmail: 'docente@gmail.com' }, new Date('2026-11-24')))
      .rejects.toThrow('@icesi.edu.co');
    expect(dataSource.transaction).not.toHaveBeenCalled();
  });

  it('validates the institutional email and required schedule shape at the API boundary', async () => {
    const invalid = Object.assign(new CreateTrainingAbsenceRequestDto(), {
      ...dto,
      teacherEmail: 'docente@icesi.edu.co.evil',
      startTime: '8:00',
    });

    const errors = await validate(invalid);
    expect(errors.map(error => error.property)).toEqual(expect.arrayContaining(['teacherEmail', 'startTime']));
  });
});
