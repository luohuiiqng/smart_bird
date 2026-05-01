import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsNotEmpty,
  Min,
  ValidateNested,
} from 'class-validator';

class ExamSubjectItemDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  subjectId!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  fullScore!: number;
}

export class SetExamSubjectsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ExamSubjectItemDto)
  @IsNotEmpty({ each: true })
  subjects!: ExamSubjectItemDto[];
}
