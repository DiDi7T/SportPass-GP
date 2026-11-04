import { IsOptional, IsString, MaxLength } from 'class-validator';

export const CANCELLATION_REASON_REQUIRED = 'El motivo de la cancelación es obligatorio.';

// HU7 CA1: el motivo es obligatorio. Si falta o queda en blanco lo rechaza el servicio con un
// único mensaje; @IsOptional evita que además aparezca el error de longitud.
export class CancelCompetitionDto {
  @IsOptional() @IsString({ message: CANCELLATION_REASON_REQUIRED }) @MaxLength(500, { message: 'El motivo admite máximo 500 caracteres.' }) reason?: string;
}
