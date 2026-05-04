import {
  Body,
  Controller,
  Delete,
  Get,
  ParseFilePipeBuilder,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import type { AuthenticatedUser } from '../common/types/auth-user';
import { ok } from '../common/types/api-response';
import { FilesService } from './files.service';
import { PresignedUrlQueryDto } from './dto/presigned-url-query.dto';
import { QueryFilesDto } from './dto/query-files.dto';
import { UpdateFilePatchDto } from './dto/update-file-patch.dto';
import { CreateAnswerSheetTemplateDto } from './dto/create-answer-sheet-template.dto';
import { UploadBinaryFileDto } from './dto/upload-binary-file.dto';
import { UploadFileDto } from './dto/upload-file.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SCHOOL_ADMIN, UserRole.TEACHER)
@Controller('files')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Get()
  async list(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Query() query: QueryFilesDto,
  ) {
    return ok(await this.filesService.list(currentUser, query));
  }

  @Post('upload')
  async upload(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() dto: UploadFileDto,
  ) {
    return ok(await this.filesService.upload(currentUser, dto));
  }

  @Post('answer-sheet-template')
  async createAnswerSheetTemplate(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() dto: CreateAnswerSheetTemplateDto,
  ) {
    return ok(await this.filesService.createAnswerSheetTemplate(currentUser, dto));
  }

  @Post('upload-binary')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 20 * 1024 * 1024 },
    }),
  )
  async uploadBinary(
    @CurrentUser() currentUser: AuthenticatedUser,
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addFileTypeValidator({ fileType: /(.*)/ })
        .addMaxSizeValidator({ maxSize: 20 * 1024 * 1024 })
        .build(),
    )
    file: {
      originalname: string;
      mimetype: string;
      size: number;
      buffer: Buffer;
    },
    @Body() dto: UploadBinaryFileDto,
  ) {
    return ok(await this.filesService.uploadBinary(currentUser, file, dto));
  }

  @Patch(':id')
  async patchFile(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateFilePatchDto,
  ) {
    return ok(await this.filesService.patchFile(currentUser, id, dto));
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
