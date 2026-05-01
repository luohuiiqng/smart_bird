import { IsString, MinLength } from 'class-validator';

export class UnpublishExamDto {
  @IsString()
  @MinLength(2)
  reason!: string;
}
