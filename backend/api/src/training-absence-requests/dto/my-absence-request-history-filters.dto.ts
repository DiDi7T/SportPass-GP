import { IsIn, IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { ABSENCE_REQUEST_STATUS_LABELS } from '../absence-request-status';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const DATE_MESSAGE = 'La fecha debe tener el formato AAAA-MM-DD.';

// HU14 CA1: filtros del historial del deportista. El rango de fechas aplica sobre el día del entrenamiento.
export class MyAbsenceRequestHistoryFiltersDto {
  @IsOptional() @IsIn(Object.keys(ABSENCE_REQUEST_STATUS_LABELS), { message: 'El estado seleccionado no es válido.' }) status?: string;
  @IsOptional() @Matches(DATE_PATTERN, { message: DATE_MESSAGE }) from?: string;
  @IsOptional() @Matches(DATE_PATTERN, { message: DATE_MESSAGE }) to?: string;
  @IsOptional() @IsString() @MaxLength(200, { message: 'La materia admite máximo 200 caracteres.' }) subject?: string;
}
