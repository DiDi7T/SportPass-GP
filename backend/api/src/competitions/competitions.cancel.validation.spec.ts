// Session debe cargarse antes que User para evitar el ciclo de imports entre ambas entidades.
import '../auth/entities/session.entity';
import { Logger } from '@nestjs/common';
import { jest } from '@jest/globals';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CompetitionCancellationEffects } from './competition-cancellation.effects';
import { acceptsPermissionRequests, CompetitionsService } from './competitions.service';
import { CancelCompetitionDto } from './dto/cancel-competition.dto';
import { resolveStatus } from '../tournaments/tournaments.service';

// HU7 (SCRUM-21) – Task 3: validar la cancelación y sus efectos.

const messages = async (body: object) =>
  (await validate(plainToInstance(CancelCompetitionDto, body))).flatMap(error => Object.values(error.constraints ?? {}));

describe('HU7 CA1 – motivo obligatorio (DTO)', () => {
  it('accepts a reason of up to 500 characters', async () => {
    expect(await messages({ reason: 'Lluvia' })).toEqual([]);
    expect(await messages({ reason: 'x'.repeat(500) })).toEqual([]);
  });

  it('rejects a reason longer than 500 characters', async () => {
    expect(await messages({ reason: 'x'.repeat(501) })).toEqual(['El motivo admite máximo 500 caracteres.']);
  });

  it('rejects a reason that is not text with the "required" message', async () => {
    expect(await messages({ reason: 42 })).toContain('El motivo de la cancelación es obligatorio.');
  });

  it('lets a missing reason reach the service, which answers with a single message', async () => {
    expect(await messages({})).toEqual([]);
    const competitions: any = {
      findOne: jest.fn(async () => ({ id: 'c', status: 'programada', endDate: '2099-05-10', endTime: '12:00:00', team: { coach: { id: 'coach-1' } } })),
    };
    const service = new CompetitionsService(competitions, {} as any, {} as any);
    await expect(service.cancel('c', {}, { sub: 'coach-1' }, new Date('2099-01-01'))).rejects.toThrow('El motivo de la cancelación es obligatorio.');
  });
});

describe('HU7 CA2 – punto de anulación y notificación', () => {
  const competition: any = { id: 'comp-1', status: 'cancelada' };

  it('has no permission requests to annul until SCRUM-14 exists', async () => {
    await expect(new CompetitionCancellationEffects().annulPermissionRequests(competition, {} as any)).resolves.toBe(0);
  });

  it('records the cancellation without sending emails until SCRUM-35/37 exist', async () => {
    const log = jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    await expect(new CompetitionCancellationEffects().notifyCancellation(competition, 3)).resolves.toBeUndefined();
    expect(log).toHaveBeenCalledWith(expect.stringContaining('comp-1'));
    log.mockRestore();
  });
});

describe('HU7 CA3 – competencia cancelada en el calendario y el historial', () => {
  const coach = { sub: 'coach-1', roles: ['coach'] };
  const team = { id: 'team-1', name: 'Fútbol', sport: 'Fútbol', coach: { id: 'coach-1' } };
  const base = { teamId: 'team-1', team, startDate: '2099-05-10', endDate: '2099-05-10', startTime: '08:00:00', endTime: '12:00:00', location: 'Coliseo', type: 'local' };

  it('keeps cancelled competitions in the list with status "cancelada" and their reason', async () => {
    const query: any = {};
    for (const method of ['innerJoinAndSelect', 'leftJoinAndSelect', 'orderBy', 'addOrderBy', 'andWhere']) query[method] = jest.fn(() => query);
    query.getMany = jest.fn(async () => [
      { ...base, id: 'a', name: 'Activa', status: 'programada', cancellationReason: null, cancelledAt: null },
      { ...base, id: 'b', name: 'Cancelada', status: 'cancelada', cancellationReason: 'Lluvia', cancelledAt: new Date('2099-01-01') },
    ]);
    const service = new CompetitionsService({ createQueryBuilder: () => query } as any, {} as any, {} as any);
    const list = await service.findManaged(coach);
    expect(list.map(item => item.status)).toEqual(['programada', 'cancelada']);
    expect(list[1].cancellation).toEqual({ reason: 'Lluvia', cancelledAt: new Date('2099-01-01') });
    expect(list[0].cancellation).toBeNull();
  });

  it('does not accept new permission requests for a cancelled competition', () => {
    expect(acceptsPermissionRequests({ status: 'cancelada' })).toBe(false);
    expect(acceptsPermissionRequests({ status: 'programada' })).toBe(true);
    expect(acceptsPermissionRequests({ status: 'aplazada' })).toBe(true);
  });

  it('is shown as "cancelada" to students in the tournaments offer, even after its date', () => {
    expect(resolveStatus({ status: 'cancelada', endDate: '2000-01-01', endTime: '12:00:00' })).toBe('cancelada');
  });
});

describe('HU7 CA4 – solo el entrenador del equipo ve la opción', () => {
  const team = { id: 'team-1', name: 'Fútbol', sport: 'Fútbol', coach: { id: 'coach-1' } };
  const stored = { id: 'c', name: 'Copa', teamId: 'team-1', team, startDate: '2099-05-10', endDate: '2099-05-10', startTime: '08:00:00', endTime: '12:00:00', location: 'Coliseo', type: 'local', status: 'programada' };
  const canCancelFor = async (actor: { sub: string; roles: string[] }, overrides: object = {}) => {
    const competitions: any = { findOne: jest.fn(async () => ({ ...stored, ...overrides })) };
    return (await new CompetitionsService(competitions, {} as any, {} as any).findOne('c', actor)).canCancel;
  };

  it('is true only for the coach of the team', async () => {
    expect(await canCancelFor({ sub: 'coach-1', roles: ['coach'] })).toBe(true);
    expect(await canCancelFor({ sub: 'admin-1', roles: ['admin'] })).toBe(false);
  });

  it('is false for a team without coach, an already cancelled or an ended competition', async () => {
    expect(await canCancelFor({ sub: 'admin-1', roles: ['admin'] }, { team: { ...team, coach: null } })).toBe(false);
    expect(await canCancelFor({ sub: 'coach-1', roles: ['coach'] }, { status: 'cancelada' })).toBe(false);
    expect(await canCancelFor({ sub: 'coach-1', roles: ['coach'] }, { startDate: '2000-01-01', endDate: '2000-01-01' })).toBe(false);
  });
});
