import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import type { AuthenticatedUser } from '../common/types/auth-user';
import { ok } from '../common/types/api-response';
import { FilesService } from './files.service';
import { PresignedUrlQueryDto } from './dto/presigned-url-query.dto';
import { UploadFileDto } from './dto/upload-file.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SCHOOL_ADMIN, UserRole.TEACHER)
@Controller('files')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post('upload')
  async upload(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() dto: UploadFileDto,
  ) {
    return ok(await this.filesService.upload(currentUser, dto));
  }

  @Get(':id')
  async detail(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return ok(await this.filesService.detail(currentUser, id));
  }

  @Get(':id/presigned-url')
  async presignedUrl(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
    @Query() query: PresignedUrlQueryDto,
  ) {
    return ok(
      await this.filesService.presignedUrl(currentUser, id, query.expiresIn),
    );
  }

  @Delete(':id')
  async remove(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return ok(await this.filesService.remove(currentUser, id));
  }
}
