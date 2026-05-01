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

export class CreateStudentDto {
  @IsString()
  @MinLength(1)
  studentNo!: string;

  @IsString()
  @MinLength(2)
  name!: string;

  @IsOptional()
  @IsString()
  gender?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  gradeId!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  classId!: number;

  @IsOptional()
  @IsEnum(EntityStatus)
  status?: EntityStatus;
}
