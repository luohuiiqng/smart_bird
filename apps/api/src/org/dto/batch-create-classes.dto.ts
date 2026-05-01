import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsString,
  Min,
  MinLength,
} from 'class-validator';

export class BatchCreateClassesDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  gradeId!: number;

  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  @MinLength(2, { each: true })
  names!: string[];
}
