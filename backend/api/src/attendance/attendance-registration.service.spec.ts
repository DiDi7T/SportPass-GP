import '../auth/entities/session.entity';
import { ConflictException, ForbiddenException, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { jest } from '@jest/globals';
import { QueryFailedError } from 'typeorm';
import {
  ALREADY_PRESENT,
  AttendanceRegistrationService,
  NOT_OFFICIAL_ATHLETE,
  STUDENT_NOT_FOUND,
  bogotaToday,
} from './attendance-registration.service';

const uniqueViolation = () => new QueryFailedError('INSERT', [], Object.assign(new Error('duplicate'), { code: '23505' }));

describe('AttendanceRegistrationService (HU9)', () => {
  // 9:00 p. m. en Bogotá = 02:00 UTC del día siguiente: la sesión debe ser la fecha de Bogotá.
  const now = new Date('2026-11-06T02:00:00Z');
  const coach = { sub: 'coach-1' };
  const user = { id: 'user-1', fullName: 'Laura Gómez', isActive: true, documentNumber: '1107012345' };
  const athlete = { id: 'athlete-1', studentCode: 'A001', isActive: true, user };

  const teams: any = { exists: jest.fn(), find: jest.fn() };
  const users: any = { findOne: jest.fn() };
  const athletes: any = { findOne: jest.fn() };
  const participants: any = { findOne: jest.fn(), findOneOrFail: jest.fn(), find: jest.fn(), save: jest.fn(), create: jest.fn((data: any) => data) };
  const attendances: any = { insert: jest.fn(), find: jest.fn() };
  let service: AttendanceRegistrationService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AttendanceRegistrationService(teams, users, athletes, participants, attendances);
    teams.exists.mockResolvedValue(true);
    users.findOne.mockResolvedValue(user);
    athletes.findOne.mockResolvedValue(athlete);
    participants.findOne.mockResolvedValue(null);
    participants.save.mockImplementation(async (data: any) => ({ ...data, id: 'participant-1' }));
    attendances.insert.mockResolvedValue({});
  });

  it('uses the Bogotá date as the training session', () => {
    expect(bogotaToday(now)).toBe('2026-11-05');
  });

  describe('CA1: first time by cédula', () => {
    it('adds the official athlete to the sport participants and marks today', async () => {
      const result = await service.checkInByDocument(coach, 'sport-1', '1.107.012.345', now);
      expect(users.findOne).toHaveBeenCalledWith({ where: { documentNumber: '1107012345' } });
      expect(participants.save).toHaveBeenCalledWith({ athleteId: 'athlete-1', sportId: 'sport-1' });
      expect(attendances.insert).toHaveBeenCalledWith({ participantId: 'participant-1', sessionDate: '2026-11-05' });
      expect(result).toEqual({
        participant: { id: 'participant-1', athleteId: 'athlete-1', fullName: 'Laura Gómez', studentCode: 'A001', presentToday: true },
        newParticipant: true,
      });
    });

    it('reuses the participant if the athlete was already registered in the sport', async () => {
      participants.findOne.mockResolvedValue({ id: 'participant-9', athleteId: 'athlete-1', sportId: 'sport-1' });
      const result = await service.checkInByDocument(coach, 'sport-1', '1107012345', now);
      expect(participants.save).not.toHaveBeenCalled();
      expect(result.newParticipant).toBe(false);
      expect(attendances.insert).toHaveBeenCalledWith({ participantId: 'participant-9', sessionDate: '2026-11-05' });
    });

    it('rejects an unknown cédula', async () => {
      users.findOne.mockResolvedValue(null);
      await expect(service.checkInByDocument(coach, 'sport-1', '999999', now)).rejects.toThrow(new NotFoundException(STUDENT_NOT_FOUND));
    });
  });

  describe('CA2: student not in the official list', () => {
    it('blocks the link when the user exists but is not an athlete', async () => {
      athletes.findOne.mockResolvedValue(null);
      const error = await service.checkInByDocument(coach, 'sport-1', '1107012345', now).catch(e => e);
      expect(error).toBeInstanceOf(UnprocessableEntityException);
      expect(error.message).toBe('El estudiante no pertenece a la lista oficial de deportista');
      expect(participants.save).not.toHaveBeenCalled();
      expect(attendances.insert).not.toHaveBeenCalled();
    });

    it('blocks the link when the institutional account is inactive', async () => {
      users.findOne.mockResolvedValue({ ...user, isActive: false });
      await expect(service.checkInByDocument(coach, 'sport-1', '1107012345', now)).rejects.toThrow(NOT_OFFICIAL_ATHLETE);
    });
  });

  describe('CA3: recurring participants', () => {
    it('lists the sport participants by name with today status', async () => {
      participants.find.mockResolvedValue([
        { id: 'p2', athleteId: 'a2', athlete: { studentCode: 'B', user: { fullName: 'Zoe Ruiz' } } },
        { id: 'p1', athleteId: 'a1', athlete: { studentCode: 'A', user: { fullName: 'Ana Díaz' } } },
      ]);
      attendances.find.mockResolvedValue([{ participantId: 'p2' }]);
      const list = await service.listParticipants(coach, 'sport-1', now);
      expect(list.map(p => [p.fullName, p.presentToday])).toEqual([['Ana Díaz', false], ['Zoe Ruiz', true]]);
    });

    it('marks attendance with one click', async () => {
      participants.findOne.mockResolvedValue({ id: 'p1', athleteId: 'a1', athlete: { ...athlete } });
      const result = await service.markAttendance(coach, 'sport-1', 'p1', now);
      expect(attendances.insert).toHaveBeenCalledWith({ participantId: 'p1', sessionDate: '2026-11-05' });
      expect(result.participant.presentToday).toBe(true);
    });
  });

  describe('CA4: duplicates', () => {
    it('rejects a second attendance the same day as "Presente"', async () => {
      participants.findOne.mockResolvedValue({ id: 'p1', athleteId: 'a1', athlete: { ...athlete } });
      attendances.insert.mockRejectedValue(uniqueViolation());
      const error = await service.markAttendance(coach, 'sport-1', 'p1', now).catch(e => e);
      expect(error).toBeInstanceOf(ConflictException);
      expect(error.message).toBe(ALREADY_PRESENT);
    });

    it('also applies to the first-time search when the student was already marked today', async () => {
      attendances.insert.mockRejectedValue(uniqueViolation());
      await expect(service.checkInByDocument(coach, 'sport-1', '1107012345', now)).rejects.toBeInstanceOf(ConflictException);
    });
  });

  it('only lets the coach of the sport register attendance', async () => {
    teams.exists.mockResolvedValue(false);
    await expect(service.checkInByDocument({ sub: 'other' }, 'sport-1', '1107012345', now)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.listParticipants({ sub: 'other' }, 'sport-1', now)).rejects.toBeInstanceOf(ForbiddenException);
    expect(attendances.insert).not.toHaveBeenCalled();
  });
});
