import { EntityStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';

export class CreateClassDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  gradeId!: number;

  @IsString()
  @MinLength(2)
  name!: string;

  @IsOptional()
  @IsEnum(EntityStatus)
  status?: EntityStatus;
}
