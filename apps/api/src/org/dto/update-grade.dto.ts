import { EntityStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateGradeDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @IsOptional()
  @IsString()
  stage?: string;

  @IsOptional()
  @IsEnum(EntityStatus)
  status?: EntityStatus;
}
