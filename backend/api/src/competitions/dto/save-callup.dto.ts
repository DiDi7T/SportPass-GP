import {
  ArrayUnique,
  IsArray,
  IsUUID,
} from 'class-validator';

export class SaveCallupDto {
  @IsArray()
  @ArrayUnique()
  @IsUUID('4', { each: true })
  athleteIds!: string[];
}