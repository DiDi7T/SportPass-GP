import '../auth/entities/session.entity';
import { ForbiddenException } from '@nestjs/common';
import { jest } from '@jest/globals';
import { summarizeAttendance } from '../attendance/attendance.service';
import { ATTENDANCE_BELOW_MINIMUM, MyCompetitionsService, NOT_AN_ATHLETE } from './my-competitions.service';

describe('summarizeAttendance (HU5)', () => {
  it('assumes 100% when there is no training history', () => {
    expect(summarizeAttendance(0, 0)).toEqual({ attendedSessions: 0, totalSessions: 0, percentage: 100, meetsMinimum: true });
  });

  it('accepts exactly 70%', () => {
    expect(summarizeAttendance(7, 10)).toMatchObject({ percentage: 70, meetsMinimum: true });
  });

  it('rejects below 70% and never rounds up to 70', () => {
    expect(summarizeAttendance(69, 100)).toMatchObject({ percentage: 69, meetsMinimum: false });
    expect(summarizeAttendance(699, 1000)).toMatchObject({ percentage: 69, meetsMinimum: false });
  });
});

describe('MyCompetitionsService (HU5)', () => {
  const now = new Date('2026-11-05T15:00:00-05:00');
  const football = { id: 'team-f', name: 'Selección Fútbol', sport: 'Fútbol', sportId: 'sport-f', isActive: true };
  const volley = { id: 'team-v', name: 'Selección Voleibol', sport: 'Voleibol', sportId: 'sport-v', isActive: true };
  const competition = (overrides: Record<string, unknown> = {}) => ({
    id: 'comp-1', name: 'Copa', teamId: 'team-f', team: football, startDate: '2026-11-20', endDate: '2026-11-20',
    startTime: '08:00:00', endTime: '12:00:00', location: 'Coliseo', venueAddress: 'Calle 18', opponent: 'Javeriana',
    type: 'local', status: 'programada', ...overrides,
  });

  const athletes: any = { findOne: jest.fn() };
  const teamAthletes: any = { find: jest.fn() };
  const sports: any = { findOne: jest.fn() };
  const competitions: any = { find: jest.fn() };
  const attendance: any = { getSportAttendance: jest.fn() };
  let service: MyCompetitionsService;

  const withAttendance = (bySport: Record<string, [number, number]>) =>
    attendance.getSportAttendance.mockImplementation(async (_athleteId: string, sportId: string | null) =>
      summarizeAttendance(...(bySport[sportId ?? ''] ?? [0, 0])));

  beforeEach(() => {
    jest.clearAllMocks();
    service = new MyCompetitionsService(athletes, teamAthletes, sports, competitions, attendance);
    athletes.findOne.mockResolvedValue({ id: 'athlete-1', isActive: true });
    teamAthletes.find.mockResolvedValue([{ team: football }]);
    competitions.find.mockResolvedValue([competition()]);
    withAttendance({});
  });

  it('CA1: returns the team competitions with date, place and opponent when attendance is at least 70%', async () => {
    withAttendance({ 'sport-f': [8, 10] });
    const result = await service.findMine('user-1', now);
    expect(result).toMatchObject({ attendancePercentage: 80, blockedSports: [] });
    expect(result.competitions).toEqual([expect.objectContaining({
      startDate: '2026-11-20', startTime: '08:00', location: 'Coliseo', opponent: 'Javeriana', team: { id: 'team-f', name: 'Selección Fútbol', sport: 'Fútbol' },
    })]);
    expect(competitions.find).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ endDate: expect.anything() }) }));
  });

  it('assumes 100% and shows competitions when the sport has no training history', async () => {
    const result = await service.findMine('user-1', now);
    expect(result.attendancePercentage).toBe(100);
    expect(result.competitions).toHaveLength(1);
  });

  it('CA2: returns an empty list when there are no upcoming competitions', async () => {
    withAttendance({ 'sport-f': [10, 10] });
    competitions.find.mockResolvedValue([]);
    await expect(service.findMine('user-1', now)).resolves.toMatchObject({ competitions: [] });
  });

  it('CA2: returns an empty list when the athlete has no team', async () => {
    teamAthletes.find.mockResolvedValue([]);
    await expect(service.findMine('user-1', now)).resolves.toMatchObject({ competitions: [], sports: [] });
    expect(competitions.find).not.toHaveBeenCalled();
  });

  it('CA3: rejects with 403 and the current percentage when attendance is below 70%', async () => {
    withAttendance({ 'sport-f': [6, 10] });
    const error = await service.findMine('user-1', now).catch(e => e);
    expect(error).toBeInstanceOf(ForbiddenException);
    expect(error.getResponse()).toMatchObject({
      code: ATTENDANCE_BELOW_MINIMUM,
      attendancePercentage: 60,
      minimumPercentage: 70,
      message: 'No cumples con el 70% de asistencia mínima para competir. Tu asistencia actual es del 60%.',
    });
    expect(competitions.find).not.toHaveBeenCalled();
  });

  it('counts an athlete who never registered as participant as 0% once the sport has trainings', async () => {
    withAttendance({ 'sport-f': [0, 4] });
    await expect(service.findMine('user-1', now)).rejects.toMatchObject({ response: { attendancePercentage: 0 } });
  });

  it('edge case: with two sports, shows only the competitions of the sport that meets 70% and lists the blocked one', async () => {
    teamAthletes.find.mockResolvedValue([{ team: football }, { team: volley }]);
    withAttendance({ 'sport-f': [9, 10], 'sport-v': [1, 10] });
    const result = await service.findMine('user-1', now);
    expect(competitions.find.mock.calls[0][0].where.teamId.value).toEqual(['team-f']);
    expect(result.blockedSports).toEqual([expect.objectContaining({ sport: 'Voleibol', attendancePercentage: 10, meetsMinimum: false })]);
  });

  it('excludes competitions that already ended today', async () => {
    competitions.find.mockResolvedValue([competition({ startDate: '2026-11-05', endDate: '2026-11-05', endTime: '14:00:00' }), competition({ id: 'comp-2' })]);
    const result = await service.findMine('user-1', now);
    expect(result.competitions.map(c => c.id)).toEqual(['comp-2']);
  });

  it('falls back to the sport name when the team has no sport_id', async () => {
    teamAthletes.find.mockResolvedValue([{ team: { ...football, sportId: null } }]);
    sports.findOne.mockResolvedValue({ id: 'sport-f' });
    withAttendance({ 'sport-f': [2, 10] });
    await expect(service.findMine('user-1', now)).rejects.toMatchObject({ response: { attendancePercentage: 20 } });
    expect(sports.findOne).toHaveBeenCalledWith({ where: { name: 'Fútbol' } });
  });

  it('rejects users that are not active official athletes', async () => {
    athletes.findOne.mockResolvedValue(null);
    await expect(service.findMine('coach-1', now)).rejects.toMatchObject({ response: { code: NOT_AN_ATHLETE } });
  });
});
