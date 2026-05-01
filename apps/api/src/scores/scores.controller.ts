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
import { PublishScoresDto } from './dto/publish-scores.dto';
import { QueryExamScoresDto } from './dto/query-exam-scores.dto';
import { UnpublishScoresDto } from './dto/unpublish-scores.dto';
import { ScoresService } from './scores.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SCHOOL_ADMIN, UserRole.TEACHER)
@Controller('scores')
export class ScoresController {
  constructor(private readonly scoresService: ScoresService) {}

  @Post('exams/:examId/recalculate')
  async recalculate(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('examId', ParseIntPipe) examId: number,
  ) {
    return ok(await this.scoresService.recalculate(currentUser, examId));
  }

  @Get('exams/:examId')
  async listExamScores(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('examId', ParseIntPipe) examId: number,
    @Query() query: QueryExamScoresDto,
  ) {
    return ok(
      await this.scoresService.listExamScores(currentUser, examId, query),
    );
  }

  @Get('exams/:examId/students/:studentId')
  async studentExamScore(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('examId', ParseIntPipe) examId: number,
    @Param('studentId', ParseIntPipe) studentId: number,
  ) {
    return ok(
      await this.scoresService.studentExamScore(currentUser, examId, studentId),
    );
  }

  @Post('exams/:examId/publish')
  async publish(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('examId', ParseIntPipe) examId: number,
    @Body() dto: PublishScoresDto,
  ) {
    return ok(await this.scoresService.publish(currentUser, examId, dto));
  }

  @Post('exams/:examId/unpublish')
  async unpublish(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('examId', ParseIntPipe) examId: number,
    @Body() dto: UnpublishScoresDto,
  ) {
    return ok(await this.scoresService.unpublish(currentUser, examId, dto));
  }
}
