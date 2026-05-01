import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class QueryExamScoresDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  gradeId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  classId?: number;

  @IsOptional()
  @IsString()
  keyword?: string;

  @IsOptional()
  @IsIn(['totalScore', 'rankInClass', 'rankInGrade'])
  sortBy?: 'totalScore' | 'rankInClass' | 'rankInGrade';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageSize?: number;
}
