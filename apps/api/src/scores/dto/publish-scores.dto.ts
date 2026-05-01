import { IsOptional, IsString, MinLength } from 'class-validator';

export class PublishScoresDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  publishNote?: string;
}
