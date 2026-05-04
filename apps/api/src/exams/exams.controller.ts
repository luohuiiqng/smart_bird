import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
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
import { ChangeExamStatusDto } from './dto/change-exam-status.dto';
import { CreateExamDto } from './dto/create-exam.dto';
import { DeleteExamDto } from './dto/delete-exam.dto';
import { QueryExamsDto } from './dto/query-exams.dto';
import { SetExamClassesDto } from './dto/set-exam-classes.dto';
import { SetExamSubjectsDto } from './dto/set-exam-subjects.dto';
import { UnpublishExamDto } from './dto/unpublish-exam.dto';
import { UpdateExamDto } from './dto/update-exam.dto';
import { ExamsService } from './exams.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SYSTEM_ADMIN, UserRole.SCHOOL_ADMIN)
@Controller('exams')
export class ExamsController {
  constructor(private readonly examsService: ExamsService) {}

  @Get()
  @Roles(UserRole.SYSTEM_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.TEACHER)
  async list(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Query() query: QueryExamsDto,
  ) {
    return ok(await this.examsService.list(currentUser, query));
  }

  @Post()
  async create(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() dto: CreateExamDto,
  ) {
    return ok(await this.examsService.create(currentUser, dto));
  }

  @Get(':id')
  @Roles(UserRole.SYSTEM_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.TEACHER)
  async detail(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return ok(await this.examsService.detail(currentUser, id));
  }

  @Patch(':id')
  async update(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateExamDto,
  ) {
    return ok(await this.examsService.update(currentUser, id, dto));
  }

  @Post(':id/classes')
  async setClasses(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SetExamClassesDto,
  ) {
    return ok(await this.examsService.setClasses(currentUser, id, dto));
  }

  @Post(':id/subjects')
  async setSubjects(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SetExamSubjectsDto,
  ) {
    return ok(await this.examsService.setSubjects(currentUser, id, dto));
  }

  @Post(':id/change-status')
  async changeStatus(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ChangeExamStatusDto,
  ) {
    return ok(await this.examsService.changeStatus(currentUser, id, dto));
  }

  @Post(':id/publish')
  async publish(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return ok(await this.examsService.publish(currentUser, id));
  }

  @Post(':id/unpublish')
  async unpublish(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UnpublishExamDto,
  ) {
    return ok(await this.examsService.unpublish(currentUser, id, dto));
  }

  @Delete(':id')
  async remove(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: DeleteExamDto,
  ) {
    return ok(await this.examsService.remove(currentUser, id, dto));
  }
}
