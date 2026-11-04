import { IsIn, IsNotEmpty, IsString, IsUUID, Matches, MaxLength } from 'class-validator';
import { COMPETITION_TYPES, type CompetitionType } from '../entities/competition.entity';

export const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
export const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
const REQUIRED = 'Todos los campos son obligatorios.';

export class CreateCompetitionDto {
  @IsString({ message: REQUIRED }) @IsNotEmpty({ message: REQUIRED }) @MaxLength(160, { message: 'El nombre admite máximo 160 caracteres.' }) name!: string;
  @IsUUID('4', { message: 'Selecciona un equipo válido.' }) teamId!: string;
  @Matches(DATE_PATTERN, { message: 'La fecha de inicio debe tener el formato AAAA-MM-DD.' }) startDate!: string;
  @Matches(DATE_PATTERN, { message: 'La fecha de fin debe tener el formato AAAA-MM-DD.' }) endDate!: string;
  @Matches(TIME_PATTERN, { message: 'La hora de inicio debe tener el formato HH:mm.' }) startTime!: string;
  @Matches(TIME_PATTERN, { message: 'La hora de fin debe tener el formato HH:mm.' }) endTime!: string;
  @IsString({ message: REQUIRED }) @IsNotEmpty({ message: REQUIRED }) @MaxLength(200, { message: 'El lugar admite máximo 200 caracteres.' }) location!: string;
  @IsIn(COMPETITION_TYPES, { message: 'El tipo debe ser local, regional o nacional.' }) type!: CompetitionType;
}
