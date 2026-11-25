import { IsEmail, IsIn, IsOptional, IsUUID, Matches } from 'class-validator';
import { ABSENCE_REQUEST_STATUSES } from '../absence-request-review.constants';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const DATE_MESSAGE = 'La fecha debe tener el formato AAAA-MM-DD.';
const STATUS_MESSAGE = 'El estado seleccionado no es válido.';

// HU20 CA1: filtros del historial general. El rango de fechas aplica sobre el día del entrenamiento.
export class AdminAbsenceRequestFiltersDto {
  @IsOptional() @IsUUID('4', { message: 'El equipo seleccionado no es válido.' }) teamId?: string;
  @IsOptional() @IsUUID('4', { message: 'El deportista seleccionado no es válido.' }) athleteId?: string;
  @IsOptional() @IsUUID('4', { message: 'La competencia seleccionada no es válida.' }) competitionId?: string;
  @IsOptional() @IsEmail({}, { message: 'El correo del profesor no es válido.' }) teacherEmail?: string;
  @IsOptional() @IsUUID('4', { message: 'El entrenador seleccionado no es válido.' }) coachId?: string;
  @IsOptional() @IsIn(ABSENCE_REQUEST_STATUSES, { message: STATUS_MESSAGE }) status?: string;
  @IsOptional() @Matches(DATE_PATTERN, { message: DATE_MESSAGE }) from?: string;
  @IsOptional() @Matches(DATE_PATTERN, { message: DATE_MESSAGE }) to?: string;
}
