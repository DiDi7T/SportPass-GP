import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { Athlete } from '../athletes/entities/athlete.entity';
import { acceptsPermissionRequests } from '../competitions/competitions.service';
import { CompetitionCallup } from '../competitions/entities/competition-callup.entity';
import { TeamCoach } from '../team-coaches/entities/team-coach.entity';
import { User } from '../users/entities/user.entity';
import { CreateTrainingAbsenceRequestDto } from './dto/create-training-absence-request.dto';
import { TrainingAbsenceRequestCoach } from './entities/training-absence-request-coach.entity';
import {
  PENDING_COACH_APPROVAL,
  TrainingAbsenceRequest,
} from './entities/training-absence-request.entity';
import { absenceRequestStatusLabel } from './absence-request-status';

const isRealDate = (value: string) => {
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
};

const competitionHasEnded = (competition: CompetitionCallup['competition'], now: Date) =>
  new Date(`${competition.endDate}T${competition.endTime.slice(0, 5)}:00-05:00`) <= now;

const toEligibleCompetition = (competition: CompetitionCallup['competition']) => ({
  id: competition.id,
  name: competition.name,
  team: { id: competition.team.id, name: competition.team.name, sport: competition.team.sport },
  startDate: competition.startDate,
  endDate: competition.endDate,
  startTime: competition.startTime.slice(0, 5),
  endTime: competition.endTime.slice(0, 5),
});

@Injectable()
export class TrainingAbsenceRequestsService {
  constructor(
    @InjectRepository(Athlete) private readonly athletes: Repository<Athlete>,
    @InjectRepository(CompetitionCallup) private readonly callups: Repository<CompetitionCallup>,
    @InjectRepository(TeamCoach) private readonly teamCoaches: Repository<TeamCoach>,
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly dataSource: DataSource,
  ) {}

  private async findActiveAthlete(userId: string) {
    const athlete = await this.athletes.findOne({
      where: { user: { id: userId }, isActive: true },
      relations: { user: { roles: true } },
    });
    if (!athlete?.user.isActive || !athlete.user.roles.some(role => role.name === 'athlete')) {
      throw new ForbiddenException('Solo un deportista activo puede crear solicitudes.');
    }
    return athlete;
  }

  private toRequestResponse(request: TrainingAbsenceRequest) {
    return {
      id: request.id,
      competition: {
        id: request.competition.id,
        name: request.competition.name,
        teamName: request.competition.team.name,
      },
      trainingDate: request.trainingDate,
      startTime: request.startTime.slice(0, 5),
      endTime: request.endTime.slice(0, 5),
      subjectName: request.subjectName,
      teacherName: request.teacherName,
      teacherEmail: request.teacherEmail,
      status: request.status,
      statusLabel: absenceRequestStatusLabel(request.status),
      createdAt: request.createdAt,
      coachRespondedAt: request.coachRespondedAt,
      rejectionComment: request.rejectionComment,
      teacherEmailSentAt: request.teacherEmailSentAt,
    };
  }

  async findMine(userId: string) {
    const athlete = await this.findActiveAthlete(userId);
    const requests = await this.dataSource.getRepository(TrainingAbsenceRequest).find({
      where: { athlete: { id: athlete.id } },
      relations: { competition: { team: true } },
      order: { createdAt: 'DESC' },
    });
    return requests.map(request => this.toRequestResponse(request));
  }

  async findOneMine(userId: string, requestId: string) {
    const athlete = await this.findActiveAthlete(userId);
    const request = await this.dataSource.getRepository(TrainingAbsenceRequest).findOne({
      where: { id: requestId, athlete: { id: athlete.id } },
      relations: { competition: { team: true } },
    });
    if (!request) throw new NotFoundException('Solicitud no encontrada.');
    return this.toRequestResponse(request);
  }

  private async findActiveCallups(athleteId: string, now: Date) {
    const callups = await this.callups.find({
      where: { athlete: { id: athleteId } },
      relations: { competition: { team: { coach: true } } },
      order: { createdAt: 'DESC' },
    });
    return callups.filter(({ competition }) =>
      acceptsPermissionRequests(competition) &&
      competition.team.isActive &&
      !competitionHasEnded(competition, now),
    );
  }

  async findEligibleCompetitions(userId: string, now = new Date()) {
    const athlete = await this.findActiveAthlete(userId);
    const callups = await this.findActiveCallups(athlete.id, now);
    return callups.map(({ competition }) => toEligibleCompetition(competition));
  }

  async create(userId: string, dto: CreateTrainingAbsenceRequestDto, now = new Date()) {
    const athlete = await this.findActiveAthlete(userId);
    const callup = (await this.findActiveCallups(athlete.id, now))
      .find(item => item.competition.id === dto.competitionId);
    if (!callup) {
      throw new ForbiddenException('Solo puedes solicitar un aviso para una competencia activa a la que estés convocado.');
    }

    const subjectName = dto.subjectName.trim();
    const teacherName = dto.teacherName.trim();
    const teacherEmail = dto.teacherEmail.trim().toLowerCase();
    if (!subjectName || !teacherName || !teacherEmail) {
      throw new BadRequestException('La materia, el nombre del docente y su correo son obligatorios.');
    }
    if (!isRealDate(dto.trainingDate)) {
      throw new BadRequestException('La fecha del entrenamiento no es válida.');
    }
    if (dto.endTime <= dto.startTime) {
      throw new BadRequestException('La hora de fin debe ser posterior a la hora de inicio.');
    }
    if (!/^[^@\s]+@icesi\.edu\.co$/i.test(teacherEmail)) {
      throw new BadRequestException('El correo del docente debe pertenecer al dominio @icesi.edu.co.');
    }

    const assignments = await this.teamCoaches.find({
      where: { teamId: callup.competition.teamId },
    });
    const coachIds = [...new Set([
      ...assignments.map(assignment => assignment.coachId),
      ...(callup.competition.team.coach ? [callup.competition.team.coach.id] : []),
    ])];
    if (!coachIds.length) {
      throw new ConflictException('La disciplina no tiene entrenadores asignados para recibir la solicitud.');
    }

    const assignedUsers = await this.users.find({
      where: { id: In(coachIds), isActive: true },
      relations: { roles: true },
    });
    const coaches = assignedUsers.filter(user => user.roles.some(role => role.name === 'coach'));
    if (!coaches.length) {
      throw new ConflictException('La disciplina no tiene entrenadores activos asignados para recibir la solicitud.');
    }

    const saved = await this.dataSource.transaction(async manager => {
      const requestRepository = manager.getRepository(TrainingAbsenceRequest);
      const request = await requestRepository.save(requestRepository.create({
        athlete: { id: athlete.id },
        competition: { id: callup.competition.id },
        trainingDate: dto.trainingDate,
        startTime: dto.startTime,
        endTime: dto.endTime,
        subjectName,
        teacherName,
        teacherEmail,
        status: PENDING_COACH_APPROVAL,
      }));
      await manager.getRepository(TrainingAbsenceRequestCoach).insert(
        coaches.map(coach => ({ requestId: request.id, coachId: coach.id })),
      );
      return request;
    });

    return {
      id: saved.id,
      competitionId: callup.competition.id,
      trainingDate: saved.trainingDate,
      startTime: saved.startTime.slice(0, 5),
      endTime: saved.endTime.slice(0, 5),
      subjectName: saved.subjectName,
      teacherName: saved.teacherName,
      teacherEmail: saved.teacherEmail,
      status: PENDING_COACH_APPROVAL,
      statusLabel: 'Pendiente de aprobación del entrenador',
      createdAt: saved.createdAt,
      coaches: coaches.map(coach => ({ id: coach.id, fullName: coach.fullName })),
    };
  }
}
