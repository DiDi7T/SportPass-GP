import { IsIn, IsOptional, Matches } from 'class-validator';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export class AbsenceAnalyticsFiltersDto {
  @IsOptional()
  @Matches(DATE_PATTERN, {
    message: 'La fecha inicial debe tener el formato AAAA-MM-DD.',
  })
  from?: string;

  @IsOptional()
  @Matches(DATE_PATTERN, {
    message: 'La fecha final debe tener el formato AAAA-MM-DD.',
  })
  to?: string;

  @IsOptional()
  @IsIn(['week', 'month'], {
    message: 'La agrupación debe ser semanal o mensual.',
  })
  groupBy?: 'week' | 'month';
}