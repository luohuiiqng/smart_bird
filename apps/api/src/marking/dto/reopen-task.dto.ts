import { IsString, MinLength } from 'class-validator';

export class ReopenTaskDto {
  @IsString()
  @MinLength(2)
  reason!: string;
}
