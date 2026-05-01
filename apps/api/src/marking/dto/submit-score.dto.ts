import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  Min,
  ValidateNested,
} from 'class-validator';

class QuestionScoreDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  questionNo!: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  score!: number;
}

export class SubmitScoreDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  studentId!: number;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => QuestionScoreDto)
  @IsNotEmpty({ each: true })
  scores!: QuestionScoreDto[];

  @IsBoolean()
  finalSubmit!: boolean;
}
