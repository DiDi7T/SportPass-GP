import { ArrayMaxSize, ArrayUnique, IsArray, IsString } from 'class-validator';

export class SetRolePermissionsDto {
  @IsArray() @ArrayUnique() @ArrayMaxSize(100) @IsString({ each: true }) codes!: string[];
}
