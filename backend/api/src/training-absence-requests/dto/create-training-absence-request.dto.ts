import { IsEmail, IsString, IsUUID, Matches, MaxLength } from 'class-validator';

export class CreateTrainingAbsenceRequestDto {
  @IsUUID('4')
  competitionId!: string;

  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  trainingDate!: string;

  @Matches(/^(?:[01]\d|2[0-3]):[0-5]\d$/)
  startTime!: string;

  @Matches(/^(?:[01]\d|2[0-3]):[0-5]\d$/)
  endTime!: string;

  @IsString()
  @MaxLength(200)
  subjectName!: string;

  @IsString()
  @MaxLength(160)
  teacherName!: string;

  @IsEmail()
  @Matches(/^[^@\s]+@icesi\.edu\.co$/i, {
    message: 'El correo del docente debe pertenecer al dominio @icesi.edu.co.',
  })
  @MaxLength(254)
  teacherEmail!: string;
}
