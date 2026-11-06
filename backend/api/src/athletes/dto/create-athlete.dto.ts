import {
  IsBoolean,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateAthleteDto {
  @IsUUID()
  userId!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(30)
  studentCode!: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
