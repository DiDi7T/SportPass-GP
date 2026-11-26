import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class DecideAbsenceRequestDto {
  @IsIn(['approve', 'reject'])
  decision!: 'approve' | 'reject';

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reason?: string;
}
