import {
  Body,
  Controller,
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
import { AssignMarkingTasksDto } from './dto/assign-marking-tasks.dto';
import { QueryMarkingTasksDto } from './dto/query-marking-tasks.dto';
import { ReopenTaskDto } from './dto/reopen-task.dto';
import { SubmitScoreDto } from './dto/submit-score.dto';
import { MarkingService } from './marking.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SCHOOL_ADMIN, UserRole.TEACHER)
@Controller('marking')
export class MarkingController {
  constructor(private readonly markingService: MarkingService) {}

  @Get('tasks')
  async listTasks(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Query() query: QueryMarkingTasksDto,
  ) {
    return ok(await this.markingService.listTasks(currentUser, query));
  }

  @Post('tasks/assign')
  async assignTasks(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() dto: AssignMarkingTasksDto,
  ) {
    return ok(await this.markingService.assignTasks(currentUser, dto));
  }

  @Post('tasks/:id/start')
  async startTask(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return ok(await this.markingService.startTask(currentUser, id));
  }

  @Get('tasks/:id/detail')
  async detailTask(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return ok(await this.markingService.detailTask(currentUser, id));
  }

  @Post('tasks/:id/submit-score')
  async submitScore(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SubmitScoreDto,
  ) {
    return ok(await this.markingService.submitScore(currentUser, id, dto));
  }

  @Post('tasks/:id/finish')
  async finishTask(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return ok(await this.markingService.finishTask(currentUser, id));
  }

  @Post('tasks/:id/reopen')
  async reopenTask(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ReopenTaskDto,
  ) {
    return ok(await this.markingService.reopenTask(currentUser, id, dto));
  }

  @Get('exam-subjects/:id/progress')
  async examSubjectProgress(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return ok(await this.markingService.examSubjectProgress(currentUser, id));
  }
}
