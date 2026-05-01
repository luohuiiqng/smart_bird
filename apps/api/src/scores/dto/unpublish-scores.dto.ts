import { IsString, MinLength } from 'class-validator';

export class UnpublishScoresDto {
  @IsString()
  @MinLength(2)
  reason!: string;
}
