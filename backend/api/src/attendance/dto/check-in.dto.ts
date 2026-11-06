import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

// HU9 CA1: registro de primera vez por cédula.
export class CheckInDto {
  @IsString({ message: 'La cédula es obligatoria.' })
  @IsNotEmpty({ message: 'La cédula es obligatoria.' })
  @MaxLength(40, { message: 'La cédula no es válida.' })
  documentNumber!: string;
}
