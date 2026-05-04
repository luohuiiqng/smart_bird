import {
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';

/** PATCH /files/:id：至少提供 fileName 或 sheetLayout 之一（服务端二次校验） */
export class UpdateFilePatchDto {
  @ValidateIf((o: UpdateFilePatchDto) => o.fileName !== undefined)
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  fileName?: string;

  @IsOptional()
  sheetLayout?: unknown;
}
