import { ExamStatus } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class ChangeExamStatusDto {
  @IsEnum(ExamStatus)
  targetStatus!: ExamStatus;
}
