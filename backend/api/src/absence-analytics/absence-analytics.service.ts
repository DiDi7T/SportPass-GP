
import {
  BadRequestException,
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';

import { TrainingAbsenceRequest } from '../training-absence-requests/entities/training-absence-request.entity';
import { TrainingAbsenceRequestCoach } from '../training-absence-requests/entities/training-absence-request-coach.entity';
import { AbsenceAnalyticsFiltersDto } from './dto/absence-analytics-filters.dto';

@Injectable()
export class AbsenceAnalyticsService {
  constructor(
    @InjectRepository(TrainingAbsenceRequest)
    private readonly requests: Repository<TrainingAbsenceRequest>,
  ) {}

  private baseQuery(
    coachId?: string,
  ): SelectQueryBuilder<TrainingAbsenceRequest> {
    const query = this.requests
      .createQueryBuilder('request')
      .leftJoin('request.competition', 'competition')
      .leftJoin('competition.team', 'team');

    // Si es entrenador, solamente consulta las solicitudes
    // que tiene asignadas.
    if (coachId) {
      query.innerJoin(
        TrainingAbsenceRequestCoach,
        'assignment',
        'assignment.requestId = request.id AND assignment.coachId = :coachId',
        { coachId },
      );
    }

    return query;
  }

  private applyDateFilters(
    query: SelectQueryBuilder<TrainingAbsenceRequest>,
    filters: AbsenceAnalyticsFiltersDto,
  ) {
    if (filters.from && filters.to && filters.from > filters.to) {
      throw new BadRequestException(
        'La fecha inicial no puede ser posterior a la fecha final.',
      );
    }

    // Se utiliza la fecha local de Colombia para interpretar
    // correctamente los límites del periodo.
    if (filters.from) {
      query.andWhere(
        "(request.createdAt AT TIME ZONE 'America/Bogota')::date >= :from",
        { from: filters.from },
      );
    }

    if (filters.to) {
      query.andWhere(
        "(request.createdAt AT TIME ZONE 'America/Bogota')::date <= :to",
        { to: filters.to },
      );
    }

    return query;
  }

  async getDashboard(
    filters: AbsenceAnalyticsFiltersDto,
    coachId?: string,
  ) {
    const summaryQuery = this.applyDateFilters(
      this.baseQuery(coachId),
      filters,
    );

    const summaryRaw = await summaryQuery
      .select('COUNT(request.id)', 'total')
      .addSelect(
        `COUNT(request.id) FILTER (
          WHERE request.status = 'approved_by_coach'
        )`,
        'approved',
      )
      .addSelect(
        `COUNT(request.id) FILTER (
          WHERE request.status = 'rejected_by_coach'
        )`,
        'rejected',
      )
      .addSelect(
        `COUNT(request.id) FILTER (
          WHERE request.status = 'pending_coach_approval'
        )`,
        'pending',
      )
      .getRawOne();

    const bySportRaw = await this.applyDateFilters(
      this.baseQuery(coachId),
      filters,
    )
      .select("COALESCE(team.sport, 'Sin disciplina')", 'sport')
      .addSelect('COUNT(request.id)', 'total')
      .where("request.status = 'approved_by_coach'")
      .groupBy('team.sport')
      .orderBy('COUNT(request.id)', 'DESC')
      .getRawMany();

    const groupBy = filters.groupBy ?? 'week';

    const timelineRaw = await this.applyDateFilters(
      this.baseQuery(coachId),
      filters,
    )
      .select(
        `TO_CHAR(
          DATE_TRUNC(
            '${groupBy}',
            request.createdAt AT TIME ZONE 'America/Bogota'
          ),
          '${groupBy === 'month' ? 'YYYY-MM' : 'YYYY-MM-DD'}'
        )`,
        'period',
      )
      .addSelect('COUNT(request.id)', 'total')
      .groupBy('period')
      .orderBy('period', 'ASC')
      .getRawMany();

    return {
      summary: {
        total: Number(summaryRaw?.total ?? 0),
        approved: Number(summaryRaw?.approved ?? 0),
        rejected: Number(summaryRaw?.rejected ?? 0),
        pending: Number(summaryRaw?.pending ?? 0),
      },
      bySport: bySportRaw.map((item) => ({
        sport: item.sport,
        total: Number(item.total),
      })),
      timeline: timelineRaw.map((item) => ({
        period: item.period,
        total: Number(item.total),
      })),
      groupBy,
    };
  }
}
