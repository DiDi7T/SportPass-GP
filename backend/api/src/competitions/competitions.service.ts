import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Not, Repository } from 'typeorm';
import { Team } from '../teams/entities/team.entity';
import { TeamCoachesService } from '../team-coaches/team-coaches.service';
import { CompetitionCancellationEffects } from './competition-cancellation.effects';
import { CANCELLATION_REASON_REQUIRED, CancelCompetitionDto } from './dto/cancel-competition.dto';
import { CreateCompetitionDto } from './dto/create-competition.dto';
import { UpdateCompetitionDto } from './dto/update-competition.dto';
import { Competition } from './entities/competition.entity';

// Colombia no tiene horario de verano, así que la zona America/Bogota es siempre UTC-5.
const BOGOTA_OFFSET = '-05:00';
const SCHEDULE_FIELDS = ['startDate', 'endDate', 'startTime', 'endTime'] as const;

export type Actor = { sub: string; roles?: string[] };
type Schedule = Pick<Competition, (typeof SCHEDULE_FIELDS)[number]>;

const isRealDate = (value: string) => {
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
};
const toInstant = (date: string, time: string) => new Date(`${date}T${time.slice(0, 5)}:00${BOGOTA_OFFSET}`);
const isAdmin = (actor: Actor) => (actor.roles ?? []).includes('admin');
export const hasEnded = (competition: Pick<Competition, 'endDate' | 'endTime'>, now: Date) => toInstant(competition.endDate, competition.endTime) <= now;

// HU7 CA4: solo el entrenador asignado al equipo cancela (ni siquiera el administrador),
// y solo mientras la competencia no esté cancelada ni haya terminado.
const canCancel = (competition: Competition, actor: Actor, now = new Date()) =>
  competition.team?.coach?.id === actor.sub && competition.status !== 'cancelada' && !hasEnded(competition, now);

// HU7 CA3: una competencia cancelada no admite nuevas solicitudes de permiso.
// La solicitud de permiso (SCRUM-14, Sprint 2) debe consultar esta regla antes de crear una.
export const acceptsPermissionRequests = (competition: Pick<Competition, 'status'>) => competition.status !== 'cancelada';

const toResponse = (competition: Competition, actor: Actor, coachCanCancel = canCancel(competition, actor)) => ({
  id: competition.id,
  name: competition.name,
  team: competition.team ? { id: competition.team.id, name: competition.team.name, sport: competition.team.sport } : { id: competition.teamId },
  startDate: competition.startDate,
  endDate: competition.endDate,
  startTime: competition.startTime.slice(0, 5),
  endTime: competition.endTime.slice(0, 5),
  location: competition.location,
  type: competition.type,
  status: competition.status,
  // HU7 CA3: la competencia cancelada conserva su motivo y fecha de cancelación.
  cancellation: competition.status === 'cancelada' ? { reason: competition.cancellationReason, cancelledAt: competition.cancelledAt } : null,
  canCancel: coachCanCancel,
  createdAt: competition.createdAt,
  updatedAt: competition.updatedAt,
});

@Injectable()
export class CompetitionsService {
  constructor(
    @InjectRepository(Competition) private readonly competitions: Repository<Competition>,
    @InjectRepository(Team) private readonly teams: Repository<Team>,
    private readonly cancellationEffects: CompetitionCancellationEffects,
    @Optional() private readonly teamCoaches?: TeamCoachesService,
  ) {}

  private async coachHasAccess(teamId: string, actor: Actor, legacyCoachId?: string | null) {
    return this.teamCoaches ? this.teamCoaches.canCoachAccess(teamId, actor.sub) : legacyCoachId === actor.sub;
  }

  private async canCoachCancel(competition: Competition, actor: Actor, now = new Date()) {
    return competition.status !== 'cancelada' && !hasEnded(competition, now) &&
      this.coachHasAccess(competition.teamId, actor, competition.team?.coach?.id);
  }

  validateSchedule(schedule: Schedule, now = new Date()) {
    if (!isRealDate(schedule.startDate) || !isRealDate(schedule.endDate)) throw new BadRequestException('La fecha ingresada no existe.');
    const start = toInstant(schedule.startDate, schedule.startTime);
    const end = toInstant(schedule.endDate, schedule.endTime);
    if (start <= now) throw new BadRequestException('No se puede registrar una competencia con fecha pasada.');
    if (end <= start) throw new BadRequestException('La fecha y hora de fin deben ser posteriores a las de inicio.');
  }

  // El administrador ve todos los equipos activos; un entrenador solo los que tiene asignados.
  async findManagedTeams(actor: Actor) {
    const teamIds = !isAdmin(actor) && this.teamCoaches ? await this.teamCoaches.managedTeamIds(actor.sub) : null;
    if (teamIds && !teamIds.length) return [];
    return this.teams.find({
      where: isAdmin(actor) ? { isActive: true } : (teamIds ? { isActive: true, id: In(teamIds) } : { isActive: true, coach: { id: actor.sub } }),
      select: { id: true, name: true, sport: true },
      order: { name: 'ASC' },
    });
  }

  private async findManageableTeam(teamId: string, actor: Actor) {
    const team = await this.teams.findOne({ where: { id: teamId, isActive: true }, relations: { coach: true } });
    if (!team) throw new NotFoundException('Equipo no encontrado.');
    if (!isAdmin(actor) && !(await this.coachHasAccess(team.id, actor, team.coach?.id))) throw new ForbiddenException('No eres entrenador de este equipo.');
    return team;
  }

  private async findManageable(id: string, actor: Actor) {
    const competition = await this.competitions.findOne({ where: { id }, relations: { team: { coach: true } } });
    if (!competition) throw new NotFoundException('Competencia no encontrada.');
    if (!isAdmin(actor) && !(await this.coachHasAccess(competition.team.id, actor, competition.team.coach?.id))) throw new ForbiddenException('No tienes permiso para gestionar esta competencia.');
    return competition;
  }

  async create(dto: CreateCompetitionDto, actor: Actor) {
    const team = await this.findManageableTeam(dto.teamId, actor);
    const competition = this.competitions.create({
      name: dto.name.trim(),
      teamId: team.id,
      startDate: dto.startDate,
      endDate: dto.endDate,
      startTime: dto.startTime,
      endTime: dto.endTime,
      location: dto.location.trim(),
      type: dto.type,
      createdById: actor.sub,
    });
    if (!competition.name || !competition.location) throw new BadRequestException('Todos los campos son obligatorios.');
    this.validateSchedule(competition);
    const saved = await this.competitions.save(competition);
    return this.findOne(saved.id, actor);
  }

  async findManaged(actor: Actor, teamId?: string) {
    // El entrenador del equipo se carga para calcular canCancel (HU7); no se expone en la respuesta.
    const query = this.competitions.createQueryBuilder('competition')
      .innerJoinAndSelect('competition.team', 'team')
      .leftJoinAndSelect('team.coach', 'coach')
      .orderBy('competition.startDate', 'ASC')
      .addOrderBy('competition.startTime', 'ASC');
    if (!isAdmin(actor)) {
      if (this.teamCoaches) {
        const teamIds = await this.teamCoaches.managedTeamIds(actor.sub);
        if (!teamIds.length) return [];
        query.andWhere('team.id IN (:...teamIds)', { teamIds });
      } else query.andWhere('coach.id = :coachId', { coachId: actor.sub });
    }
    if (teamId) query.andWhere('team.id = :teamId', { teamId });
    return Promise.all((await query.getMany()).map(async competition => toResponse(competition, actor, await this.canCoachCancel(competition, actor))));
  }

  async findOne(id: string, actor: Actor) {
    const competition = await this.findManageable(id, actor);
    return toResponse(competition, actor, await this.canCoachCancel(competition, actor));
  }

  async update(id: string, dto: UpdateCompetitionDto, actor: Actor) {
    const competition = await this.findManageable(id, actor);
    if (competition.status === 'cancelada') throw new ConflictException('No se puede editar una competencia cancelada.');
    const changes = Object.fromEntries(Object.entries(dto).filter(([, value]) => value !== undefined)) as UpdateCompetitionDto;
    if (Object.keys(changes).length === 0) throw new BadRequestException('Debes modificar al menos la fecha, la hora o el lugar.');
    if (changes.location !== undefined) {
      changes.location = changes.location.trim();
      if (!changes.location) throw new BadRequestException('El lugar no puede quedar vacío.');
    }

    const next = { ...competition, ...changes };
    // Solo se validan las reglas de horario si cambió la programación: así se puede
    // corregir el lugar de una competencia en curso sin que falle por "fecha pasada".
    if (SCHEDULE_FIELDS.some(field => changes[field] !== undefined)) this.validateSchedule(next);

    await this.competitions.update({ id }, changes);
    return this.findOne(id, actor);
  }

  // HU7: cancelar no borra la competencia. Queda "cancelada" con su motivo, quién la canceló y cuándo.
  async cancel(id: string, dto: CancelCompetitionDto, actor: Actor, now = new Date()) {
    const competition = await this.competitions.findOne({ where: { id }, relations: { team: { coach: true } } });
    if (!competition) throw new NotFoundException('Competencia no encontrada.');
    if (!(await this.coachHasAccess(competition.team.id, actor, competition.team.coach?.id))) throw new ForbiddenException('Solo un entrenador asignado al equipo puede cancelar esta competencia.');
    if (competition.status === 'cancelada') throw new ConflictException('La competencia ya está cancelada.');
    if (hasEnded(competition, now)) throw new BadRequestException('No se puede cancelar una competencia que ya finalizó.');
    const reason = dto.reason?.trim();
    if (!reason) throw new BadRequestException(CANCELLATION_REASON_REQUIRED);

    const cancellation = { status: 'cancelada' as const, cancellationReason: reason, cancelledById: actor.sub, cancelledAt: now };
    const cancelled = { ...competition, ...cancellation };
    const annulledRequests = await this.competitions.manager.transaction(async manager => {
      // La condición sobre el estado evita cancelar dos veces si llegan dos peticiones a la vez.
      const { affected } = await manager.update(Competition, { id, status: Not('cancelada') }, cancellation);
      if (!affected) throw new ConflictException('La competencia ya está cancelada.');
      return this.cancellationEffects.annulPermissionRequests(cancelled, manager);
    });
    await this.cancellationEffects.notifyCancellation(cancelled, annulledRequests);
    return this.findOne(id, actor);
  }
}
