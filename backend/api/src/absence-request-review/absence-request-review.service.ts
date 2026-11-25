import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository, SelectQueryBuilder } from 'typeorm';
import { CompetitionCallup } from '../competitions/entities/competition-callup.entity';
import { absenceRequestStatusLabel } from '../training-absence-requests/absence-request-status';
import { TrainingAbsenceRequestCoach } from '../training-absence-requests/entities/training-absence-request-coach.entity';
import { TrainingAbsenceRequest } from '../training-absence-requests/entities/training-absence-request.entity';
import { User } from '../users/entities/user.entity';
import { PENDING_STATUS } from './absence-request-review.constants';
import { AdminAbsenceRequestFiltersDto, TeacherAbsenceRequestFiltersDto } from './dto/absence-request-filters.dto';

type Query = SelectQueryBuilder<TrainingAbsenceRequest>;

export type ReviewedAbsenceRequest = ReturnType<typeof toResponse>;

// Solo se exponen datos de identificación del deportista. El modelo no almacena promedio
// ni historial académico, y la respuesta tampoco debe incluirlos (HU16 CA3).
const toResponse = (request: TrainingAbsenceRequest, coaches: { fullName: string; email: string }[], officialCallup: boolean) => ({
  id: request.id,
  status: request.status,
  statusLabel: absenceRequestStatusLabel(request.status),
  createdAt: request.createdAt,
  subjectName: request.subjectName,
  teacherName: request.teacherName,
  teacherEmail: request.teacherEmail,
  trainingDate: request.trainingDate,
  startTime: request.startTime.slice(0, 5),
  endTime: request.endTime.slice(0, 5),
  coachRespondedAt: request.coachRespondedAt,
  rejectionComment: request.rejectionComment,
  teacherEmailSentAt: request.teacherEmailSentAt,
  athlete: {
    id: request.athlete.id,
    fullName: request.athlete.user.fullName,
    email: request.athlete.user.email,
    studentCode: request.athlete.studentCode,
  },
  competition: {
    id: request.competition.id,
    name: request.competition.name,
    startDate: request.competition.startDate,
    endDate: request.competition.endDate,
    startTime: request.competition.startTime.slice(0, 5),
    endTime: request.competition.endTime.slice(0, 5),
    location: request.competition.location,
    status: request.competition.status,
    team: { id: request.competition.team.id, name: request.competition.team.name, sport: request.competition.team.sport },
  },
  officialCallup,
  coaches,
});

@Injectable()
export class AbsenceRequestReviewService {
  constructor(
    @InjectRepository(TrainingAbsenceRequest) private readonly requests: Repository<TrainingAbsenceRequest>,
    @InjectRepository(TrainingAbsenceRequestCoach) private readonly requestCoaches: Repository<TrainingAbsenceRequestCoach>,
    @InjectRepository(CompetitionCallup) private readonly callups: Repository<CompetitionCallup>,
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {}

  private baseQuery(): Query {
    return this.requests.createQueryBuilder('request')
      .innerJoinAndSelect('request.athlete', 'athlete')
      .innerJoinAndSelect('athlete.user', 'athleteUser')
      .innerJoinAndSelect('request.competition', 'competition')
      .innerJoinAndSelect('competition.team', 'team');
  }

  // Las solicitudes pendientes van primero; dentro de cada grupo, la competencia más próxima.
  private orderByPriority(query: Query): Query {
    return query
      .addSelect('CASE WHEN request.status = :pendingStatus THEN 0 ELSE 1 END', 'pending_rank')
      .setParameter('pendingStatus', PENDING_STATUS)
      .orderBy('pending_rank', 'ASC')
      .addOrderBy('competition.startDate', 'ASC')
      .addOrderBy('competition.startTime', 'ASC')
      .addOrderBy('request.createdAt', 'DESC');
  }

  // Completa entrenadores y convocatoria en dos consultas para todo el lote, no una por solicitud.
  private async withDetails(requests: TrainingAbsenceRequest[]) {
    if (!requests.length) return [];
    const ids = requests.map(request => request.id);
    const assignments = await this.requestCoaches.find({ where: { requestId: In(ids) }, relations: { coach: true } });
    const callups = await this.callups.createQueryBuilder('callup')
      .innerJoin('callup.athlete', 'athlete')
      .innerJoin('callup.competition', 'competition')
      .select(['callup.id', 'athlete.id', 'competition.id'])
      .where('athlete.id IN (:...athleteIds)', { athleteIds: [...new Set(requests.map(request => request.athlete.id))] })
      .andWhere('competition.id IN (:...competitionIds)', { competitionIds: [...new Set(requests.map(request => request.competition.id))] })
      .getMany();
    const calledUp = new Set(callups.map(callup => `${callup.athlete.id}:${callup.competition.id}`));

    return requests.map(request => toResponse(
      request,
      assignments
        .filter(assignment => assignment.requestId === request.id)
        .map(assignment => ({ fullName: assignment.coach.fullName, email: assignment.coach.email })),
      calledUp.has(`${request.athlete.id}:${request.competition.id}`),
    ));
  }

  // El profesor se identifica por su correo institucional, que es el que registra el deportista en la solicitud.
  private async teacherEmail(userId: string) {
    const user = await this.users.findOne({ where: { id: userId, isActive: true } });
    if (!user) throw new ForbiddenException('No tienes acceso a las solicitudes.');
    return user.email.toLowerCase();
  }

  private forTeacher(query: Query, email: string) {
    return query.where('LOWER(request.teacherEmail) = :teacherEmail', { teacherEmail: email });
  }

  async findForTeacher(userId: string, filters: TeacherAbsenceRequestFiltersDto) {
    const query = this.forTeacher(this.baseQuery(), await this.teacherEmail(userId));
    if (filters.course) query.andWhere('request.subjectName = :course', { course: filters.course });
    if (filters.status) query.andWhere('request.status = :status', { status: filters.status });
    if (filters.date) query.andWhere('request.trainingDate = :date', { date: filters.date });
    return this.withDetails(await this.orderByPriority(query).getMany());
  }

  async findTeacherCourses(userId: string) {
    const rows = await this.requests.createQueryBuilder('request')
      .select('DISTINCT request.subjectName', 'course')
      .where('LOWER(request.teacherEmail) = :teacherEmail', { teacherEmail: await this.teacherEmail(userId) })
      .orderBy('course', 'ASC')
      .getRawMany<{ course: string }>();
    return rows.map(row => row.course);
  }

  async findOneForTeacher(userId: string, id: string) {
    const request = await this.forTeacher(this.baseQuery(), await this.teacherEmail(userId))
      .andWhere('request.id = :id', { id })
      .getOne();
    if (!request) throw new NotFoundException('Solicitud no encontrada.');
    return (await this.withDetails([request]))[0];
  }

  private applyAdminFilters(query: Query, filters: AdminAbsenceRequestFiltersDto) {
    if (filters.teamId) query.andWhere('team.id = :teamId', { teamId: filters.teamId });
    if (filters.athleteId) query.andWhere('athlete.id = :athleteId', { athleteId: filters.athleteId });
    if (filters.competitionId) query.andWhere('competition.id = :competitionId', { competitionId: filters.competitionId });
    if (filters.teacherEmail) query.andWhere('LOWER(request.teacherEmail) = :teacherEmail', { teacherEmail: filters.teacherEmail.toLowerCase() });
    if (filters.status) query.andWhere('request.status = :status', { status: filters.status });
    if (filters.from) query.andWhere('request.trainingDate >= :from', { from: filters.from });
    if (filters.to) query.andWhere('request.trainingDate <= :to', { to: filters.to });
    return query;
  }

  async findForAdmin(filters: AdminAbsenceRequestFiltersDto) {
    const query = this.applyAdminFilters(this.baseQuery(), filters)
      .orderBy('request.trainingDate', 'DESC')
      .addOrderBy('request.createdAt', 'DESC');
    return this.withDetails(await query.getMany());
  }

  async findOneForAdmin(id: string) {
    const request = await this.baseQuery().where('request.id = :id', { id }).getOne();
    if (!request) throw new NotFoundException('Solicitud no encontrada.');
    return (await this.withDetails([request]))[0];
  }

  // Opciones de los filtros de HU20, tomadas de las solicitudes existentes.
  async findAdminFilterOptions() {
    const requests = await this.baseQuery().getMany();
    const unique = <T extends { id: string }>(items: T[]) =>
      [...new Map(items.map(item => [item.id, item])).values()];
    const byLabel = (a: { label: string }, b: { label: string }) => a.label.localeCompare(b.label, 'es');

    return {
      teams: unique(requests.map(r => ({ id: r.competition.team.id, label: r.competition.team.name }))).sort(byLabel),
      athletes: unique(requests.map(r => ({ id: r.athlete.id, label: r.athlete.user.fullName }))).sort(byLabel),
      competitions: unique(requests.map(r => ({ id: r.competition.id, label: r.competition.name }))).sort(byLabel),
      teachers: unique(requests.map(r => ({ id: r.teacherEmail.toLowerCase(), label: `${r.teacherName} (${r.teacherEmail.toLowerCase()})` }))).sort(byLabel),
    };
  }
}
