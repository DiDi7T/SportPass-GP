// Session debe cargarse antes que User para evitar el ciclo de imports entre ambas entidades.
import '../auth/entities/session.entity';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { jest } from '@jest/globals';
import { CompetitionsService } from './competitions.service';

describe('CompetitionsService', () => {
  const competitions: any = { create: jest.fn((data: any) => data), save: jest.fn(), findOne: jest.fn(), update: jest.fn() };
  const teams: any = { findOne: jest.fn() };
  const coach = { sub: 'coach-1', roles: ['coach'] };
  const team = { id: 'team-1', name: 'Fútbol', sport: 'Fútbol', coach: { id: 'coach-1' }, isActive: true };
  const stored = {
    id: 'comp-1', name: 'Copa', teamId: 'team-1', team, startDate: '2099-05-10', endDate: '2099-05-10',
    startTime: '08:00:00', endTime: '12:00:00', location: 'Coliseo', type: 'local',
  };
  const valid = { name: 'Copa', teamId: 'team-1', startDate: '2099-05-10', endDate: '2099-05-10', startTime: '08:00', endTime: '12:00', location: 'Coliseo', type: 'local' as const };
  let service: CompetitionsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new CompetitionsService(competitions, teams, {} as any);
    teams.findOne.mockResolvedValue(team);
    competitions.findOne.mockResolvedValue(stored);
    competitions.save.mockImplementation(async (data: any) => ({ ...data, id: 'comp-1' }));
  });

  it('registers a competition for a team the coach manages', async () => {
    const result = await service.create(valid, coach);
    expect(competitions.save).toHaveBeenCalledWith(expect.objectContaining({ teamId: 'team-1', createdById: 'coach-1' }));
    expect(result).toMatchObject({ id: 'comp-1', startTime: '08:00', team: { name: 'Fútbol' } });
  });

  it('rejects competitions in the past', async () => {
    await expect(service.create({ ...valid, startDate: '2020-01-01', endDate: '2020-01-01' }, coach)).rejects.toThrow('fecha pasada');
    expect(competitions.save).not.toHaveBeenCalled();
  });

  it('rejects an end that is not after the start', async () => {
    await expect(service.create({ ...valid, endTime: '08:00' }, coach)).rejects.toThrow('posteriores a las de inicio');
    await expect(service.create({ ...valid, endDate: '2099-05-09' }, coach)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects dates that do not exist', async () => {
    await expect(service.create({ ...valid, startDate: '2099-02-31' }, coach)).rejects.toThrow('no existe');
  });

  it('rejects blank text fields', async () => {
    await expect(service.create({ ...valid, location: '   ' }, coach)).rejects.toThrow('obligatorios');
  });

  it('forbids registering for a team coached by someone else', async () => {
    await expect(service.create(valid, { sub: 'other-coach', roles: ['coach'] })).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('updates only the provided fields', async () => {
    await service.update('comp-1', { location: ' Estadio ' }, coach);
    expect(competitions.update).toHaveBeenCalledWith({ id: 'comp-1' }, { location: 'Estadio' });
  });

  it('validates the merged schedule when editing', async () => {
    await expect(service.update('comp-1', { endTime: '07:00' }, coach)).rejects.toThrow('posteriores a las de inicio');
    expect(competitions.update).not.toHaveBeenCalled();
  });

  it('requires at least one change', async () => {
    await expect(service.update('comp-1', {}, coach)).rejects.toBeInstanceOf(BadRequestException);
  });
});
