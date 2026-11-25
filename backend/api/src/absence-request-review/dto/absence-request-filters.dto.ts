import { IsEmail, IsIn, IsOptional, IsString, IsUUID, Matches, MaxLength } from 'class-validator';
import { ABSENCE_REQUEST_STATUSES } from '../absence-request-review.constants';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const DATE_MESSAGE = 'La fecha debe tener el formato AAAA-MM-DD.';
const STATUS_MESSAGE = 'El estado seleccionado no es válido.';

// HU16 CA2: filtros de la bandeja del profesor. La fecha corresponde al día de la clase.
export class TeacherAbsenceRequestFiltersDto {
  @IsOptional() @IsString() @MaxLength(200) course?: string;
  @IsOptional() @IsIn(ABSENCE_REQUEST_STATUSES, { message: STATUS_MESSAGE }) status?: string;
  @IsOptional() @Matches(DATE_PATTERN, { message: DATE_MESSAGE }) date?: string;
}

// HU20 CA1: filtros del historial general. El rango de fechas aplica sobre el día de la clase.
export class AdminAbsenceRequestFiltersDto {
  @IsOptional() @IsUUID('4', { message: 'El equipo seleccionado no es válido.' }) teamId?: string;
  @IsOptional() @IsUUID('4', { message: 'El deportista seleccionado no es válido.' }) athleteId?: string;
  @IsOptional() @IsUUID('4', { message: 'La competencia seleccionada no es válida.' }) competitionId?: string;
  @IsOptional() @IsEmail({}, { message: 'El correo del profesor no es válido.' }) teacherEmail?: string;
  @IsOptional() @IsIn(ABSENCE_REQUEST_STATUSES, { message: STATUS_MESSAGE }) status?: string;
  @IsOptional() @Matches(DATE_PATTERN, { message: DATE_MESSAGE }) from?: string;
  @IsOptional() @Matches(DATE_PATTERN, { message: DATE_MESSAGE }) to?: string;
}
