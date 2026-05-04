import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateAnswerSheetTemplateDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  fileName?: string;
}
