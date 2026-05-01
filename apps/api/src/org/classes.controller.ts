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
import { BatchCreateClassesDto } from './dto/batch-create-classes.dto';
import { CreateClassDto } from './dto/create-class.dto';
import { QueryClassesDto } from './dto/query-classes.dto';
import { UpdateClassDto } from './dto/update-class.dto';
import { OrgService } from './org.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SYSTEM_ADMIN, UserRole.SCHOOL_ADMIN)
@Controller('org/classes')
export class ClassesController {
  constructor(private readonly orgService: OrgService) {}

  @Get()
  async list(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Query() query: QueryClassesDto,
  ) {
    return ok(await this.orgService.listClasses(currentUser, query));
  }

  @Post()
  async create(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() dto: CreateClassDto,
  ) {
    return ok(await this.orgService.createClass(currentUser, dto));
  }

  @Post('batch-create')
  async batchCreate(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() dto: BatchCreateClassesDto,
  ) {
    return ok(await this.orgService.batchCreateClasses(currentUser, dto));
  }

  @Patch(':id')
  async update(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateClassDto,
  ) {
    return ok(await this.orgService.updateClass(currentUser, id, dto));
  }

  @Delete(':id')
  async delete(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return ok(await this.orgService.deleteClass(currentUser, id));
  }
}
