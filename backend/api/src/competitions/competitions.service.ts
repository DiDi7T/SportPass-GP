import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';

import { Team } from '../teams/entities/team.entity';
import { Athlete } from '../athletes/entities/athlete.entity';
import { TeamAthlete } from '../team-athletes/entities/team-athlete.entity';

import { CompetitionCancellationEffects } from './competition-cancellation.effects';
import {
  CANCELLATION_REASON_REQUIRED,
  CancelCompetitionDto,
} from './dto/cancel-competition.dto';
import { CreateCompetitionDto } from './dto/create-competition.dto';
import { UpdateCompetitionDto } from './dto/update-competition.dto';
import { SaveCallupDto } from './dto/save-callup.dto';

import { Competition } from './entities/competition.entity';
import { CompetitionCallup } from './entities/competition-callup.entity';

// Colombia no tiene horario de verano: UTC-5.
const BOGOTA_OFFSET = '-05:00';

const SCHEDULE_FIELDS = [
  'startDate',
  'endDate',
  'startTime',
  'endTime',
] as const;

export type Actor = {
  sub: string;
  roles?: string[];
};

type Schedule = Pick<Competition, (typeof SCHEDULE_FIELDS)[number]>;

const isRealDate = (value: string) => {
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
};

const toInstant = (date: string, time: string) =>
  new Date(`${date}T${time.slice(0, 5)}:00${BOGOTA_OFFSET}`);

const isAdmin = (actor: Actor) =>
  (actor.roles ?? []).includes('admin');

const hasEnded = (competition: Competition, now: Date) =>
  toInstant(competition.endDate, competition.endTime) <= now;

// HU7 CA4: solo el entrenador asignado puede cancelar.
const canCancel = (
  competition: Competition,
  actor: Actor,
  now = new Date(),
) =>
  competition.team?.coach?.id === actor.sub &&
  competition.status !== 'cancelada' &&
  !hasEnded(competition, now);

// HU7 CA3: una competencia cancelada no admite nuevas solicitudes de permiso.
export const acceptsPermissionRequests = (
  competition: Pick<Competition, 'status'>,
) => competition.status !== 'cancelada';

const toResponse = (competition: Competition, actor: Actor) => ({
  id: competition.id,
  name: competition.name,
  team: competition.team
    ? {
        id: competition.team.id,
        name: competition.team.name,
        sport: competition.team.sport,
      }
    : { id: competition.teamId },
  startDate: competition.startDate,
  endDate: competition.endDate,
  startTime: competition.startTime.slice(0, 5),
  endTime: competition.endTime.slice(0, 5),
  location: competition.location,
  type: competition.type,
  status: competition.status,
  cancellation:
    competition.status === 'cancelada'
      ? {
          reason: competition.cancellationReason,
          cancelledAt: competition.cancelledAt,
        }
      : null,
  canCancel: canCancel(competition, actor),
  createdAt: competition.createdAt,
  updatedAt: competition.updatedAt,
});

@Injectable()
export class CompetitionsService {
  constructor(
    @InjectRepository(Competition)
    private readonly competitions: Repository<Competition>,

    @InjectRepository(Team)
    private readonly teams: Repository<Team>,

    private readonly cancellationEffects: CompetitionCancellationEffects,

    @InjectRepository(CompetitionCallup)
    private readonly callups: Repository<CompetitionCallup>,

    @InjectRepository(TeamAthlete)
    private readonly teamAthletes: Repository<TeamAthlete>,

    @InjectRepository(Athlete)
    private readonly athletes: Repository<Athlete>,
  ) {}

  validateSchedule(schedule: Schedule, now = new Date()) {
    if (
      !isRealDate(schedule.startDate) ||
      !isRealDate(schedule.endDate)
    ) {
      throw new BadRequestException('La fecha ingresada no existe.');
    }

    const start = toInstant(schedule.startDate, schedule.startTime);
    const end = toInstant(schedule.endDate, schedule.endTime);

    if (start <= now) {
      throw new BadRequestException(
        'No se puede registrar una competencia con fecha pasada.',
      );
    }

    if (end <= start) {
      throw new BadRequestException(
        'La fecha y hora de fin deben ser posteriores a las de inicio.',
      );
    }
  }

  // El administrador ve todos los equipos activos;
  // el entrenador solo los que tiene asignados.
  findManagedTeams(actor: Actor) {
    return this.teams.find({
      where: isAdmin(actor)
        ? { isActive: true }
        : { isActive: true, coach: { id: actor.sub } },
      select: {
        id: true,
        name: true,
        sport: true,
      },
      order: {
        name: 'ASC',
      },
    });
  }

  private async findManageableTeam(teamId: string, actor: Actor) {
    const team = await this.teams.findOne({
      where: {
        id: teamId,
        isActive: true,
      },
      relations: {
        coach: true,
      },
    });

    if (!team) {
      throw new NotFoundException('Equipo no encontrado.');
    }

    if (!isAdmin(actor) && team.coach?.id !== actor.sub) {
      throw new ForbiddenException(
        'No eres el entrenador de este equipo.',
      );
    }

    return team;
  }

  private async findManageable(id: string, actor: Actor) {
    const competition = await this.competitions.findOne({
      where: { id },
      relations: {
        team: {
          coach: true,
        },
      },
    });

    if (!competition) {
      throw new NotFoundException('Competencia no encontrada.');
    }

    if (
      !isAdmin(actor) &&
      competition.team.coach?.id !== actor.sub
    ) {
      throw new ForbiddenException(
        'No tienes permiso para gestionar esta competencia.',
      );
    }

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

    if (!competition.name || !competition.location) {
      throw new BadRequestException(
        'Todos los campos son obligatorios.',
      );
    }

    this.validateSchedule(competition);

    const saved = await this.competitions.save(competition);

    return this.findOne(saved.id, actor);
  }

  async findManaged(actor: Actor, teamId?: string) {
    const query = this.competitions
      .createQueryBuilder('competition')
      .innerJoinAndSelect('competition.team', 'team')
      .leftJoinAndSelect('team.coach', 'coach')
      .orderBy('competition.startDate', 'ASC')
      .addOrderBy('competition.startTime', 'ASC');

    if (!isAdmin(actor)) {
      query.andWhere('coach.id = :coachId', {
        coachId: actor.sub,
      });
    }

    if (teamId) {
      query.andWhere('team.id = :teamId', { teamId });
    }

    const competitions = await query.getMany();

    return competitions.map((competition) =>
      toResponse(competition, actor),
    );
  }

  async findOne(id: string, actor: Actor) {
    const competition = await this.findManageable(id, actor);

    return toResponse(competition, actor);
  }

  async update(
    id: string,
    dto: UpdateCompetitionDto,
    actor: Actor,
  ) {
    const competition = await this.findManageable(id, actor);

    if (competition.status === 'cancelada') {
      throw new ConflictException(
        'No se puede editar una competencia cancelada.',
      );
    }

    const changes = Object.fromEntries(
      Object.entries(dto).filter(([, value]) => value !== undefined),
    ) as UpdateCompetitionDto;

    if (Object.keys(changes).length === 0) {
      throw new BadRequestException(
        'Debes modificar al menos la fecha, la hora o el lugar.',
      );
    }

    if (changes.location !== undefined) {
      changes.location = changes.location.trim();

      if (!changes.location) {
        throw new BadRequestException(
          'El lugar no puede quedar vacío.',
        );
      }
    }

    const next = { ...competition, ...changes };

    if (
      SCHEDULE_FIELDS.some(
        (field) => changes[field] !== undefined,
      )
    ) {
      this.validateSchedule(next);
    }

    await this.competitions.update({ id }, changes);

    return this.findOne(id, actor);
  }

  // HU7: cancelar conserva la competencia y registra el motivo.
  async cancel(
    id: string,
    dto: CancelCompetitionDto,
    actor: Actor,
    now = new Date(),
  ) {
    const competition = await this.competitions.findOne({
      where: { id },
      relations: {
        team: {
          coach: true,
        },
      },
    });

    if (!competition) {
      throw new NotFoundException('Competencia no encontrada.');
    }

    if (competition.team.coach?.id !== actor.sub) {
      throw new ForbiddenException(
        'Solo el entrenador del equipo puede cancelar esta competencia.',
      );
    }

    if (competition.status === 'cancelada') {
      throw new ConflictException(
        'La competencia ya está cancelada.',
      );
    }

    if (hasEnded(competition, now)) {
      throw new BadRequestException(
        'No se puede cancelar una competencia que ya finalizó.',
      );
    }

    const reason = dto.reason?.trim();

    if (!reason) {
      throw new BadRequestException(
        CANCELLATION_REASON_REQUIRED,
      );
    }

    const cancellation = {
      status: 'cancelada' as const,
      cancellationReason: reason,
      cancelledById: actor.sub,
      cancelledAt: now,
    };

    const cancelled = {
      ...competition,
      ...cancellation,
    };

    const annulledRequests =
      await this.competitions.manager.transaction(
        async (manager) => {
          const { affected } = await manager.update(
            Competition,
            { id, status: Not('cancelada') },
            cancellation,
          );

          if (!affected) {
            throw new ConflictException(
              'La competencia ya está cancelada.',
            );
          }

          return this.cancellationEffects.annulPermissionRequests(
            cancelled,
            manager,
          );
        },
      );

    await this.cancellationEffects.notifyCancellation(
      cancelled,
      annulledRequests,
    );

    return this.findOne(id, actor);
  }

  // Consultar integrantes activos y su estado de convocatoria.
  async findCallup(id: string, actor: Actor) {
    const competition = await this.findManageable(id, actor);

    const [members, callups] = await Promise.all([
      this.teamAthletes.find({
        where: {
          team: { id: competition.teamId },
          active: true,
        },
        relations: {
          athlete: {
            user: true,
          },
        },
        order: {
          createdAt: 'ASC',
        },
      }),

      this.callups.find({
        where: {
          competition: { id },
        },
        relations: {
          athlete: {
            user: true,
          },
        },
      }),
    ]);

    const calledUpIds = new Set(
      callups.map((callup) => callup.athlete.id),
    );

    return {
      competitionId: competition.id,
      competitionName: competition.name,
      teamId: competition.teamId,
      athletes: members
        .filter(
          (member) =>
            member.athlete.isActive &&
            member.athlete.user.isActive,
        )
        .map((member) => ({
          id: member.athlete.id,
          firstName: member.athlete.firstName,
          lastName: member.athlete.lastName,
          studentCode: member.athlete.studentCode,
          email: member.athlete.user.email,
          calledUp: calledUpIds.has(member.athlete.id),
        })),
    };
  }

  // Guardar la selección completa de convocados.
  async saveCallup(
    id: string,
    dto: SaveCallupDto,
    actor: Actor,
  ) {
    const competition = await this.findManageable(id, actor);

    // Solo el entrenador asignado puede modificar la convocatoria.
    if (competition.team.coach?.id !== actor.sub) {
      throw new ForbiddenException(
        'Solo el entrenador asignado puede gestionar la convocatoria.',
      );
    }

    if (competition.status === 'cancelada') {
      throw new ConflictException(
        'No se puede convocar deportistas a una competencia cancelada.',
      );
    }

    const athleteIds = dto.athleteIds;

    if (athleteIds.length > 0) {
      const validAssignments = await this.teamAthletes
        .createQueryBuilder('assignment')
        .innerJoin('assignment.athlete', 'athlete')
        .innerJoin('athlete.user', 'user')
        .where('assignment.team_id = :teamId', {
          teamId: competition.teamId,
        })
        .andWhere('assignment.athlete_id IN (:...athleteIds)', {
          athleteIds,
        })
        .andWhere('assignment.active = true')
        .andWhere('athlete.isActive = true')
        .andWhere('user.isActive = true')
        .getCount();

      if (validAssignments !== athleteIds.length) {
        throw new BadRequestException(
          'Uno o más deportistas no pertenecen activamente a este equipo o están inactivos.',
        );
      }
    }

    await this.competitions.manager.transaction(
      async (manager) => {
        const callupRepository =
          manager.getRepository(CompetitionCallup);

        await callupRepository.delete({
          competition: { id },
        });

        if (athleteIds.length > 0) {
          const athleteRepository =
            manager.getRepository(Athlete);

          const newCallups = athleteIds.map((athleteId) =>
            callupRepository.create({
              competition: { id } as Competition,
              athlete: athleteRepository.create({
                id: athleteId,
              }),
            }),
          );

          await callupRepository.save(newCallups);
        }
      },
    );

    return this.findCallup(id, actor);
  }
}