import { IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { DATE_PATTERN, TIME_PATTERN } from './create-competition.dto';

// HU6: solo se pueden modificar la fecha, la hora y el lugar. Los demás campos
// son rechazados por el ValidationPipe global (forbidNonWhitelisted).
export class UpdateCompetitionDto {
  @IsOptional() @Matches(DATE_PATTERN, { message: 'La fecha de inicio debe tener el formato AAAA-MM-DD.' }) startDate?: string;
  @IsOptional() @Matches(DATE_PATTERN, { message: 'La fecha de fin debe tener el formato AAAA-MM-DD.' }) endDate?: string;
  @IsOptional() @Matches(TIME_PATTERN, { message: 'La hora de inicio debe tener el formato HH:mm.' }) startTime?: string;
  @IsOptional() @Matches(TIME_PATTERN, { message: 'La hora de fin debe tener el formato HH:mm.' }) endTime?: string;
  @IsOptional() @IsString() @IsNotEmpty({ message: 'El lugar no puede quedar vacío.' }) @MaxLength(200, { message: 'El lugar admite máximo 200 caracteres.' }) location?: string;
}
