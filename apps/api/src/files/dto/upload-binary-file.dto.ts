import { FileCategory } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class UploadBinaryFileDto {
  @IsEnum(FileCategory)
  category!: FileCategory;

  @IsOptional()
  @IsString()
  bizType?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  bizId?: number;
}
