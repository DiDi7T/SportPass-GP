// Session debe cargarse antes que User para evitar el ciclo de imports entre ambas entidades.
import '../auth/entities/session.entity';
import { NotFoundException } from '@nestjs/common';
import { jest } from '@jest/globals';
import { resolveStatus, TournamentsService } from './tournaments.service';

describe('resolveStatus (CA3)', () => {
  // 2099-05-10 12:00 en Bogotá (UTC-5) = 17:00 UTC.
  const end = { endDate: '2099-05-10', endTime: '12:00:00' };
  const before = new Date('2099-05-10T16:59:00Z');
  const atEnd = new Date('2099-05-10T17:00:00Z');

  it('keeps the stored status while the match has not ended', () => {
    expect(resolveStatus({ ...end, status: 'programada' }, before)).toBe('programada');
    expect(resolveStatus({ ...end, status: 'aplazada' }, before)).toBe('aplazada');
  });

  it('marks the match as finalizada once its end (Bogotá time) has passed', () => {
    expect(resolveStatus({ ...end, status: 'programada' }, atEnd)).toBe('finalizada');
    expect(resolveStatus({ ...end, status: 'aplazada' }, atEnd)).toBe('finalizada');
  });

  it('keeps cancelada even after the end date', () => {
    expect(resolveStatus({ ...end, status: 'cancelada' }, before)).toBe('cancelada');
    expect(resolveStatus({ ...end, status: 'cancelada' }, atEnd)).toBe('cancelada');
  });
});

describe('TournamentsService', () => {
  const now = new Date('2099-01-01T00:00:00Z');
  const team = { id: 'team-1', name: 'Selección Fútbol', sport: 'Fútbol', isActive: true, coach: { id: 'coach-1', email: 'coach@icesi.edu.co' } };
  const stored = {
    id: 'comp-1', name: 'Copa', teamId: 'team-1', team, startDate: '2099-05-10', endDate: '2099-05-10',
    startTime: '08:00:00', endTime: '12:00:00', location: 'Coliseo', type: 'local', status: 'programada',
    opponent: 'Universidad Javeriana', venueAddress: 'Calle 18 #122-135, Cali', createdById: 'coach-1',
  };
  const query: any = {};
  for (const method of ['innerJoinAndSelect', 'where', 'orderBy', 'addOrderBy']) query[method] = jest.fn(() => query);
  query.getMany = jest.fn();
  const competitions: any = { createQueryBuilder: jest.fn(() => query), findOne: jest.fn() };
  let service: TournamentsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new TournamentsService(competitions);
    query.getMany.mockResolvedValue([stored]);
    competitions.findOne.mockResolvedValue(stored);
  });

  it('lists matches with date, time, teams, tournament and venue (CA1)', async () => {
    const [match] = await service.findMatches(now);
    expect(match).toEqual({
      id: 'comp-1',
      tournament: 'Copa',
      type: 'local',
      teams: { icesi: 'Selección Fútbol', sport: 'Fútbol', opponent: 'Universidad Javeriana' },
      startDate: '2099-05-10',
      endDate: '2099-05-10',
      startTime: '08:00',
      endTime: '12:00',
      venue: { name: 'Coliseo', address: 'Calle 18 #122-135, Cali' },
      status: 'programada',
    });
  });

  it('only lists matches of active teams, ordered by start', async () => {
    await service.findMatches(now);
    expect(query.where).toHaveBeenCalledWith('team.isActive = :active', { active: true });
    expect(query.orderBy).toHaveBeenCalledWith('competition.startDate', 'ASC');
    expect(query.addOrderBy).toHaveBeenCalledWith('competition.startTime', 'ASC');
  });

  it('does not expose who created the competition or the coach', async () => {
    const [match] = await service.findMatches(now);
    const json = JSON.stringify(match);
    expect(json).not.toContain('coach');
    expect(json).not.toContain('createdBy');
  });

  it('shows each match with its status (CA3)', async () => {
    query.getMany.mockResolvedValue([
      { ...stored, id: 'a', status: 'programada' },
      { ...stored, id: 'b', status: 'aplazada' },
      { ...stored, id: 'c', status: 'cancelada' },
      { ...stored, id: 'd', status: 'programada', endDate: '2098-12-31' },
    ]);
    const matches = await service.findMatches(now);
    expect(matches.map(match => match.status)).toEqual(['programada', 'aplazada', 'cancelada', 'finalizada']);
  });

  it('returns the detail with venue name and address (CA2)', async () => {
    const match = await service.findMatch('comp-1', now);
    expect(competitions.findOne).toHaveBeenCalledWith({ where: { id: 'comp-1', team: { isActive: true } }, relations: { team: true } });
    expect(match.venue).toEqual({ name: 'Coliseo', address: 'Calle 18 #122-135, Cali' });
  });

  it('returns null address and opponent when they are not available (CA2)', async () => {
    competitions.findOne.mockResolvedValue({ ...stored, opponent: null, venueAddress: null });
    const match = await service.findMatch('comp-1', now);
    expect(match.venue.address).toBeNull();
    expect(match.teams.opponent).toBeNull();
  });

  it('fails with 404 when the match does not exist', async () => {
    competitions.findOne.mockResolvedValue(null);
    await expect(service.findMatch('missing', now)).rejects.toBeInstanceOf(NotFoundException);
  });
});
