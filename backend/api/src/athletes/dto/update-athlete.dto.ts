import {
  IsBoolean,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class UpdateAthleteDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(30)
  studentCode?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
