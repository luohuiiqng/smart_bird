import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsNotEmpty,
  Min,
  ValidateNested,
} from 'class-validator';

class AssignmentItemDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  teacherId!: number;

  @IsArray()
  @ArrayMinSize(1)
  @Type(() => Number)
  @IsInt({ each: true })
  @Min(1, { each: true })
  studentIds!: number[];
}

export class AssignMarkingTasksDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  examSubjectId!: number;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => AssignmentItemDto)
  @IsNotEmpty({ each: true })
  assignments!: AssignmentItemDto[];
}
