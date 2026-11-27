import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository, SelectQueryBuilder } from 'typeorm';
import { CompetitionCallup } from '../competitions/entities/competition-callup.entity';
import { TeacherApprovalEmailService } from '../teacher-notifications/teacher-approval-email.service';
import { absenceRequestStatusLabel } from '../training-absence-requests/absence-request-status';
import { TrainingAbsenceRequestCoach } from '../training-absence-requests/entities/training-absence-request-coach.entity';
import { TrainingAbsenceRequest } from '../training-absence-requests/entities/training-absence-request.entity';
import { PENDING_STATUS } from './absence-request-review.constants';
import { AdminAbsenceRequestFiltersDto } from './dto/absence-request-filters.dto';

type Query = SelectQueryBuilder<TrainingAbsenceRequest>;

export type ReviewedAbsenceRequest = ReturnType<typeof toResponse>;

// Del deportista solo se exponen datos de identificación; el modelo no almacena información académica.
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
  // HU18 CA4: resultado del último intento de envío del correo al docente.
  teacherEmailStatus: request.teacherEmailStatus,
  teacherEmailError: request.teacherEmailError,
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

// El nombre del docente lo escribe el deportista en cada solicitud, así que un mismo correo
// puede llegar con nombres distintos. El filtro se agrupa por correo y muestra todos los nombres.
const teacherOptions = (requests: TrainingAbsenceRequest[]) => {
  const namesByEmail = new Map<string, Set<string>>();
  for (const request of requests) {
    const email = request.teacherEmail.toLowerCase();
    const names = namesByEmail.get(email) ?? new Set<string>();
    names.add(request.teacherName.trim());
    namesByEmail.set(email, names);
  }
  return [...namesByEmail].map(([email, names]) => ({
    id: email,
    label: `${[...names].sort((x, y) => x.localeCompare(y, 'es')).join(' / ')} (${email})`,
  }));
};

@Injectable()
export class AbsenceRequestReviewService {
  constructor(
    @InjectRepository(TrainingAbsenceRequest) private readonly requests: Repository<TrainingAbsenceRequest>,
    @InjectRepository(TrainingAbsenceRequestCoach) private readonly requestCoaches: Repository<TrainingAbsenceRequestCoach>,
    @InjectRepository(CompetitionCallup) private readonly callups: Repository<CompetitionCallup>,
    private readonly teacherEmails: TeacherApprovalEmailService,
  ) {}

  private baseQuery(): Query {
    return this.requests.createQueryBuilder('request')
      .innerJoinAndSelect('request.athlete', 'athlete')
      .innerJoinAndSelect('athlete.user', 'athleteUser')
      .innerJoinAndSelect('request.competition', 'competition')
      .innerJoinAndSelect('competition.team', 'team');
  }

  // HU16 CA3: primero las pendientes, desde el entrenamiento más próximo; después las demás,
  // de la más reciente a la más antigua.
  private orderByPriority(query: Query): Query {
    return query
      .addSelect('CASE WHEN request.status = :pendingStatus THEN 0 ELSE 1 END', 'pending_rank')
      .addSelect('CASE WHEN request.status = :pendingStatus THEN request.trainingDate END', 'pending_training_date')
      .setParameter('pendingStatus', PENDING_STATUS)
      .orderBy('pending_rank', 'ASC')
      .addOrderBy('pending_training_date', 'ASC')
      .addOrderBy('request.trainingDate', 'DESC')
      .addOrderBy('request.startTime', 'ASC');
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

  // HU16 CA1: HU11 asigna cada solicitud a los entrenadores de la disciplina del deportista
  // (training_absence_request_coaches); el entrenador solo ve las que tiene asignadas.
  private forCoach(query: Query, coachId: string) {
    return query.innerJoin(
      TrainingAbsenceRequestCoach,
      'assignment',
      'assignment.requestId = request.id AND assignment.coachId = :coachId',
      { coachId },
    );
  }

  async findForCoach(coachId: string) {
    return this.withDetails(await this.orderByPriority(this.forCoach(this.baseQuery(), coachId)).getMany());
  }

  async findOneForCoach(coachId: string, id: string) {
    const request = await this.forCoach(this.baseQuery(), coachId).where('request.id = :id', { id }).getOne();
    if (!request) throw new NotFoundException('Solicitud no encontrada.');
    return (await this.withDetails([request]))[0];
  }

  // HU17: aprobación/rechazo irreversible mediante UPDATE condicionado por estado.
  async decideForCoach(coachId: string, id: string, decision: 'approve' | 'reject', reason?: string) {
    if (decision !== 'approve' && decision !== 'reject') {
      throw new BadRequestException('La decisión debe ser aprobar o rechazar.');
    }
    const comment = reason?.trim() ?? '';
    if (decision === 'reject' && !comment) {
      throw new BadRequestException('Debes indicar un motivo para rechazar la solicitud.');
    }
    if (comment.length > 1000) {
      throw new BadRequestException('El motivo no puede superar 1000 caracteres.');
    }
    const current = await this.findOneForCoach(coachId, id);
    if (current.status !== PENDING_STATUS) {
      throw new ConflictException('Esta solicitud ya fue procesada y no puede modificarse.');
    }
    if (decision === 'approve' && !current.officialCallup) {
      throw new ConflictException('No se puede aprobar sin una convocatoria oficial registrada.');
    }
    const updated = await this.requests.update(
      { id, status: PENDING_STATUS },
      {
        status: decision === 'approve' ? 'approved_by_coach' : 'rejected_by_coach',
        coachRespondedAt: new Date(),
        respondedByCoach: { id: coachId },
        rejectionComment: decision === 'reject' ? comment : null,
      },
    );
    if (updated.affected !== 1) {
      throw new ConflictException('Otro usuario ya procesó esta solicitud.');
    }
    // HU18: al aprobar se envía el correo al docente. Si falla, la solicitud sigue aprobada y el
    // error queda registrado; teacher_email_sent_at solo se llena cuando el envío fue exitoso.
    if (decision === 'approve') await this.teacherEmails.notifyTeacherOfApproval(id);
    return this.findOneForCoach(coachId, id);
  }

  private applyAdminFilters(query: Query, filters: AdminAbsenceRequestFiltersDto) {
    if (filters.teamId) query.andWhere('team.id = :teamId', { teamId: filters.teamId });
    if (filters.athleteId) query.andWhere('athlete.id = :athleteId', { athleteId: filters.athleteId });
    if (filters.competitionId) query.andWhere('competition.id = :competitionId', { competitionId: filters.competitionId });
    if (filters.teacherEmail) query.andWhere('LOWER(request.teacherEmail) = :teacherEmail', { teacherEmail: filters.teacherEmail.toLowerCase() });
    // Entrenadores a los que HU11 asignó la solicitud.
    if (filters.coachId) {
      query.andWhere(qb => `EXISTS ${qb.subQuery()
        .select('1')
        .from(TrainingAbsenceRequestCoach, 'assignment')
        .where('assignment.requestId = request.id')
        .andWhere('assignment.coachId = :coachId')
        .getQuery()}`, { coachId: filters.coachId });
    }
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
    const assignments = requests.length
      ? await this.requestCoaches.find({ where: { requestId: In(requests.map(r => r.id)) }, relations: { coach: true } })
      : [];
    const unique = <T extends { id: string }>(items: T[]) =>
      [...new Map(items.map(item => [item.id, item])).values()];
    const byLabel = (a: { label: string }, b: { label: string }) => a.label.localeCompare(b.label, 'es');

    return {
      teams: unique(requests.map(r => ({ id: r.competition.team.id, label: r.competition.team.name }))).sort(byLabel),
      athletes: unique(requests.map(r => ({ id: r.athlete.id, label: r.athlete.user.fullName }))).sort(byLabel),
      competitions: unique(requests.map(r => ({ id: r.competition.id, label: r.competition.name }))).sort(byLabel),
      teachers: teacherOptions(requests).sort(byLabel),
      coaches: unique(assignments.map(a => ({ id: a.coachId, label: a.coach.fullName }))).sort(byLabel),
    };
  }
}
