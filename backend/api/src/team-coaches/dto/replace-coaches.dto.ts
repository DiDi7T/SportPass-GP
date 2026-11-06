import { ArrayMaxSize, ArrayUnique, IsArray, IsUUID } from 'class-validator';

export class ReplaceCoachesDto {
  @IsArray()
  @ArrayMaxSize(100)
  @ArrayUnique()
  @IsUUID('4', { each: true })
  coachIds!: string[];
}
