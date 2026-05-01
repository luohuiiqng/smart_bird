import { EntityStatus, UserRole } from '@prisma/client';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';

export class CreateUserDto {
  @IsOptional()
  @IsInt()
  schoolId?: number;

  @IsString()
  @MinLength(4)
  username!: string;

  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[A-Za-z])(?=.*\d).+$/, {
    message: 'password must include letters and numbers',
  })
  password!: string;

  @IsString()
  @MinLength(2)
  realName!: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsEnum(UserRole)
  role!: UserRole;

  @IsOptional()
  @IsEnum(EntityStatus)
  status?: EntityStatus;
}
