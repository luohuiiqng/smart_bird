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
import { CreateGradeDto } from './dto/create-grade.dto';
import { QueryGradesDto } from './dto/query-grades.dto';
import { UpdateGradeDto } from './dto/update-grade.dto';
import { OrgService } from './org.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SYSTEM_ADMIN, UserRole.SCHOOL_ADMIN)
@Controller('org/grades')
export class GradesController {
  constructor(private readonly orgService: OrgService) {}

  @Get()
  async list(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Query() query: QueryGradesDto,
  ) {
    return ok(await this.orgService.listGrades(currentUser, query));
  }

  @Post()
  async create(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() dto: CreateGradeDto,
  ) {
    return ok(await this.orgService.createGrade(currentUser, dto));
  }

  @Patch(':id')
  async update(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateGradeDto,
  ) {
    return ok(await this.orgService.updateGrade(currentUser, id, dto));
  }

  @Delete(':id')
  async delete(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return ok(await this.orgService.deleteGrade(currentUser, id));
  }
}
