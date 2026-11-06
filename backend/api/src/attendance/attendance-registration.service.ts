import { ConflictException, ForbiddenException, Injectable, NotFoundException, UnprocessableEntityException, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, QueryFailedError, Repository } from 'typeorm';
import { Athlete } from '../athletes/entities/athlete.entity';
import { Team } from '../teams/entities/team.entity';
import { TeamCoachesService } from '../team-coaches/team-coaches.service';
import { isValidDocumentNumber, normalizeDocumentNumber } from '../users/document-number';
import { User } from '../users/entities/user.entity';
import { Attendance } from './entities/attendance.entity';
import { Participant } from './entities/participant.entity';

export type Actor = { sub: string };

export const NOT_COACH_OF_SPORT = 'No eres entrenador de este deporte.';
export const STUDENT_NOT_FOUND = 'No existe un estudiante registrado con esa cédula.';
// HU9 CA2 (texto de la historia de usuario).
export const NOT_OFFICIAL_ATHLETE = 'El estudiante no pertenece a la lista oficial de deportista';
// HU9 CA4.
export const ALREADY_PRESENT = 'El estudiante ya tiene asistencia registrada hoy: Presente.';

// Colombia es siempre UTC-5: la sesión de entrenamiento es la fecha de hoy en Bogotá.
const BOGOTA_OFFSET_MS = 5 * 60 * 60 * 1000;
export const bogotaToday = (now: Date) => new Date(now.getTime() - BOGOTA_OFFSET_MS).toISOString().slice(0, 10);

const isUniqueViolation = (error: unknown) =>
  error instanceof QueryFailedError && (error.driverError as { code?: string } | undefined)?.code === '23505';

const toParticipantResponse = (participant: Participant, presentToday: boolean) => ({
  id: participant.id,
  athleteId: participant.athleteId,
  fullName: participant.athlete.user.fullName,
  studentCode: participant.athlete.studentCode,
  presentToday,
});

@Injectable()
export class AttendanceRegistrationService {
  constructor(
    @InjectRepository(Team) private readonly teams: Repository<Team>,
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Athlete) private readonly athletes: Repository<Athlete>,
    @InjectRepository(Participant) private readonly participants: Repository<Participant>,
    @InjectRepository(Attendance) private readonly attendances: Repository<Attendance>,
    @Optional() private readonly teamCoaches?: TeamCoachesService,
  ) {}

  // Deportes en los que el entrenador tiene al menos un equipo activo.
  async findMySports(actor: Actor) {
    const assignedIds = this.teamCoaches ? await this.teamCoaches.managedTeamIds(actor.sub) : null;
    if (assignedIds && !assignedIds.length) return [];
    const teams = await this.teams.find({
      where: assignedIds ? { id: In(assignedIds), isActive: true } : { coach: { id: actor.sub }, isActive: true },
      relations: { sportRecord: true },
    });
    const sports = new Map<string, { id: string; name: string }>();
    for (const team of teams) {
      if (team.sportRecord) sports.set(team.sportRecord.id, { id: team.sportRecord.id, name: team.sportRecord.name });
    }
    return [...sports.values()].sort((a, b) => a.name.localeCompare(b.name, 'es'));
  }

  // CA3: lista de participantes del deporte, con su estado de hoy.
  async listParticipants(actor: Actor, sportId: string, now = new Date()) {
    await this.assertCoachOfSport(actor, sportId);
    const participants = await this.participants.find({
      where: { sportId, athlete: { isActive: true, user: { isActive: true } } },
      relations: { athlete: { user: true } },
    });
    const present = await this.presentToday(participants.map(participant => participant.id), now);
    return participants
      .map(participant => toParticipantResponse(participant, present.has(participant.id)))
      .sort((a, b) => a.fullName.localeCompare(b.fullName, 'es'));
  }

  // CA1 / CA2: primera vez. Busca por cédula, valida que sea atleta oficial activo,
  // lo agrega a los participantes del deporte (si no estaba) y marca la asistencia de hoy.
  async checkInByDocument(actor: Actor, sportId: string, rawDocumentNumber: string, now = new Date()) {
    await this.assertCoachOfSport(actor, sportId);
    const documentNumber = normalizeDocumentNumber(rawDocumentNumber);
    if (!isValidDocumentNumber(documentNumber)) throw new NotFoundException(STUDENT_NOT_FOUND);

    const user = await this.users.findOne({ where: { documentNumber } });
    if (!user) throw new NotFoundException(STUDENT_NOT_FOUND);
    const athlete = await this.athletes.findOne({ where: { user: { id: user.id }, isActive: true } });
    if (!athlete || !user.isActive) throw new UnprocessableEntityException(NOT_OFFICIAL_ATHLETE);

    const { participant, created } = await this.findOrCreateParticipant(athlete, sportId);
    participant.athlete = { ...athlete, user } as Athlete;
    await this.markToday(participant.id, now);
    return { participant: toParticipantResponse(participant, true), newParticipant: created };
  }

  // CA3 / CA4: asistencia de un participante recurrente con un solo clic.
  async markAttendance(actor: Actor, sportId: string, participantId: string, now = new Date()) {
    await this.assertCoachOfSport(actor, sportId);
    const participant = await this.participants.findOne({
      where: { id: participantId, sportId },
      relations: { athlete: { user: true } },
    });
    if (!participant) throw new NotFoundException('El participante no existe en este deporte.');
    if (!participant.athlete.isActive || !participant.athlete.user.isActive) throw new UnprocessableEntityException(NOT_OFFICIAL_ATHLETE);
    await this.markToday(participant.id, now);
    return { participant: toParticipantResponse(participant, true) };
  }

  private async assertCoachOfSport(actor: Actor, sportId: string) {
    const assignedIds = this.teamCoaches ? await this.teamCoaches.managedTeamIds(actor.sub) : null;
    const coachesSport = assignedIds ? assignedIds.length > 0 && await this.teams.exists({ where: { id: In(assignedIds), isActive: true, sportId } })
      : await this.teams.exists({ where: { coach: { id: actor.sub }, isActive: true, sportId } });
    if (!coachesSport) throw new ForbiddenException(NOT_COACH_OF_SPORT);
  }

  private async presentToday(participantIds: string[], now: Date) {
    if (participantIds.length === 0) return new Set<string>();
    const rows = await this.attendances.find({
      where: { participantId: In(participantIds), sessionDate: bogotaToday(now) },
      select: { participantId: true },
    });
    return new Set(rows.map(row => row.participantId));
  }

  private async findOrCreateParticipant(athlete: Athlete, sportId: string) {
    const existing = await this.participants.findOne({ where: { athleteId: athlete.id, sportId } });
    if (existing) return { participant: existing, created: false };
    try {
      const participant = await this.participants.save(this.participants.create({ athleteId: athlete.id, sportId }));
      return { participant, created: true };
    } catch (error) {
      // Dos registros simultáneos de la misma cédula: uq_athlete_deporte deja pasar solo uno.
      if (!isUniqueViolation(error)) throw error;
      const participant = await this.participants.findOneOrFail({ where: { athleteId: athlete.id, sportId } });
      return { participant, created: false };
    }
  }

  // CA4: uq_asistencia_diaria (participant_id, session_date) impide el duplicado
  // incluso si llegan dos clics a la vez.
  private async markToday(participantId: string, now: Date) {
    try {
      await this.attendances.insert({ participantId, sessionDate: bogotaToday(now) });
    } catch (error) {
      if (isUniqueViolation(error)) throw new ConflictException(ALREADY_PRESENT);
      throw error;
    }
  }
}
