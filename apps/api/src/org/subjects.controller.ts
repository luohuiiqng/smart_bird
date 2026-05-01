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
import { CreateSubjectDto } from './dto/create-subject.dto';
import { QuerySubjectsDto } from './dto/query-subjects.dto';
import { UpdateSubjectDto } from './dto/update-subject.dto';
import { OrgService } from './org.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SYSTEM_ADMIN, UserRole.SCHOOL_ADMIN)
@Controller('org/subjects')
export class SubjectsController {
  constructor(private readonly orgService: OrgService) {}

  @Get()
  async list(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Query() query: QuerySubjectsDto,
  ) {
    return ok(await this.orgService.listSubjects(currentUser, query));
  }

  @Post()
  async create(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() dto: CreateSubjectDto,
  ) {
    return ok(await this.orgService.createSubject(currentUser, dto));
  }

  @Patch(':id')
  async update(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSubjectDto,
  ) {
    return ok(await this.orgService.updateSubject(currentUser, id, dto));
  }

  @Delete(':id')
  async delete(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return ok(await this.orgService.deleteSubject(currentUser, id));
  }
}
