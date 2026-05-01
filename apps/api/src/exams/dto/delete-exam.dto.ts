import { IsOptional, IsString, MinLength } from 'class-validator';

export class DeleteExamDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  reason?: string;
}
