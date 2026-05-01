import { FileCategory } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
} from 'class-validator';

export class UploadFileDto {
  @IsEnum(FileCategory)
  category!: FileCategory;

  @IsString()
  @MinLength(1)
  fileName!: string;

  @IsString()
  @MinLength(3)
  contentType!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20 * 1024 * 1024)
  size!: number;

  @IsOptional()
  @IsString()
  bizType?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  bizId?: number;
}
