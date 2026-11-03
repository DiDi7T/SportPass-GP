import {
  IsBoolean,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateTeamDto {
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  name!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  sport!: string;

  @IsOptional()
  @IsUUID()
  coachId?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}