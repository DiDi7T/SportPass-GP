import { IsUUID } from 'class-validator';

export class AssignAthleteDto {
  @IsUUID()
  athleteId!: string;
}