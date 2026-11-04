// Session debe cargarse antes que User para evitar el ciclo de imports entre ambas entidades.
import '../auth/entities/session.entity';
import { BadRequestException, ConflictException, ForbiddenException, NotFoundException, RequestMethod } from '@nestjs/common';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { jest } from '@jest/globals';
import { REQUIRED_PERMISSION } from '../auth/guards/permission.guard';
import { CompetitionsController } from './competitions.controller';
import { CompetitionsService } from './competitions.service';
import { Competition } from './entities/competition.entity';

// HU7 (SCRUM-21) – Cancelar una competencia.
describe('CompetitionsService.cancel', () => {
  const now = new Date('2099-01-01T12:00:00Z');
  const coach = { sub: 'coach-1', roles: ['coach'] };
  const team = { id: 'team-1', name: 'Fútbol', sport: 'Fútbol', coach: { id: 'coach-1' }, isActive: true };
  const stored = {
    id: 'comp-1', name: 'Copa', teamId: 'team-1', team, startDate: '2099-05-10', endDate: '2099-05-10',
    startTime: '08:00:00', endTime: '12:00:00', location: 'Coliseo', type: 'local', status: 'programada',
    cancellationReason: null, cancelledById: null, cancelledAt: null,
  };
  const manager: any = { update: jest.fn() };
  const competitions: any = { findOne: jest.fn(), update: jest.fn(), manager: { transaction: jest.fn((work: any) => work(manager)) } };
  const effects: any = { annulPermissionRequests: jest.fn(), notifyCancellation: jest.fn() };
  let service: CompetitionsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new CompetitionsService(competitions, {} as any, effects);
    competitions.findOne.mockResolvedValue(stored);
    manager.update.mockResolvedValue({ affected: 1 });
    effects.annulPermissionRequests.mockResolvedValue(2);
  });

  it('cancels with the reason, who cancelled it and when, without deleting it (CA1)', async () => {
    await service.cancel('comp-1', { reason: '  Lluvia en el escenario  ' }, coach, now);
    expect(manager.update).toHaveBeenCalledWith(
      Competition,
      { id: 'comp-1', status: expect.anything() },
      { status: 'cancelada', cancellationReason: 'Lluvia en el escenario', cancelledById: 'coach-1', cancelledAt: now },
    );
    expect(competitions).not.toHaveProperty('delete');
  });

  it('requires a non-blank reason (CA1)', async () => {
    await expect(service.cancel('comp-1', { reason: '   ' }, coach, now)).rejects.toThrow('El motivo de la cancelación es obligatorio.');
    await expect(service.cancel('comp-1', {} as any, coach, now)).rejects.toBeInstanceOf(BadRequestException);
    expect(manager.update).not.toHaveBeenCalled();
  });

  it('annuls the permission requests in the same transaction and then notifies (CA2)', async () => {
    await service.cancel('comp-1', { reason: 'Lluvia' }, coach, now);
    expect(competitions.manager.transaction).toHaveBeenCalledTimes(1);
    expect(effects.annulPermissionRequests).toHaveBeenCalledWith(expect.objectContaining({ id: 'comp-1', status: 'cancelada' }), manager);
    expect(effects.notifyCancellation).toHaveBeenCalledWith(expect.objectContaining({ id: 'comp-1', status: 'cancelada' }), 2);
  });

  it('does not notify when the cancellation fails', async () => {
    manager.update.mockResolvedValue({ affected: 0 });
    await expect(service.cancel('comp-1', { reason: 'Lluvia' }, coach, now)).rejects.toBeInstanceOf(ConflictException);
    expect(effects.annulPermissionRequests).not.toHaveBeenCalled();
    expect(effects.notifyCancellation).not.toHaveBeenCalled();
  });

  it('returns the competition as cancelada with its reason (CA3)', async () => {
    competitions.findOne
      .mockResolvedValueOnce(stored)
      .mockResolvedValueOnce({ ...stored, status: 'cancelada', cancellationReason: 'Lluvia', cancelledAt: now });
    const result = await service.cancel('comp-1', { reason: 'Lluvia' }, coach, now);
    expect(result).toMatchObject({ status: 'cancelada', cancellation: { reason: 'Lluvia', cancelledAt: now }, canCancel: false });
  });

  it('cannot cancel twice', async () => {
    competitions.findOne.mockResolvedValue({ ...stored, status: 'cancelada' });
    await expect(service.cancel('comp-1', { reason: 'Otra vez' }, coach, now)).rejects.toThrow('ya está cancelada');
    expect(manager.update).not.toHaveBeenCalled();
  });

  it('cannot cancel a competition that already ended', async () => {
    await expect(service.cancel('comp-1', { reason: 'Tarde' }, coach, new Date('2099-05-10T17:00:00Z'))).rejects.toThrow('ya finalizó');
  });

  it('only the coach of the team can cancel, not another coach nor the admin (CA4)', async () => {
    await expect(service.cancel('comp-1', { reason: 'X' }, { sub: 'other-coach', roles: ['coach'] }, now)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.cancel('comp-1', { reason: 'X' }, { sub: 'admin-1', roles: ['admin'] }, now)).rejects.toBeInstanceOf(ForbiddenException);
    expect(manager.update).not.toHaveBeenCalled();
  });

  it('fails with 404 when the competition does not exist', async () => {
    competitions.findOne.mockResolvedValue(null);
    await expect(service.cancel('missing', { reason: 'X' }, coach, now)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('a cancelled competition cannot be edited', async () => {
    competitions.findOne.mockResolvedValue({ ...stored, status: 'cancelada' });
    await expect(service.update('comp-1', { location: 'Estadio' }, coach)).rejects.toThrow('No se puede editar una competencia cancelada.');
    expect(competitions.update).not.toHaveBeenCalled();
  });

  it('tells the frontend who can see the "Cancelar competencia" option (CA4)', async () => {
    expect(await service.findOne('comp-1', coach)).toMatchObject({ status: 'programada', cancellation: null, canCancel: true });
    expect(await service.findOne('comp-1', { sub: 'admin-1', roles: ['admin'] })).toMatchObject({ canCancel: false });
  });
});

describe('CompetitionsController cancel route', () => {
  it('is POST /competitions/:id/cancel and keeps the competitions:manage permission', () => {
    const handler = CompetitionsController.prototype.cancel;
    expect(Reflect.getMetadata(METHOD_METADATA, handler)).toBe(RequestMethod.POST);
    expect(Reflect.getMetadata(PATH_METADATA, handler)).toBe(':id/cancel');
    expect(Reflect.getMetadata(REQUIRED_PERMISSION, CompetitionsController)).toBe('competitions:manage');
  });
});
