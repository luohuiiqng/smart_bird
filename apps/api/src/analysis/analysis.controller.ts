import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
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
import { AnalysisService } from './analysis.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SCHOOL_ADMIN, UserRole.TEACHER)
@Controller('analysis')
export class AnalysisController {
  constructor(private readonly analysisService: AnalysisService) {}

  @Get('exams/:examId/summary')
  async examSummary(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('examId', ParseIntPipe) examId: number,
  ) {
    return ok(await this.analysisService.examSummary(currentUser, examId));
  }

  @Get('exams/:examId/class-compare')
  async classCompare(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('examId', ParseIntPipe) examId: number,
    @Query('gradeId') gradeId?: string,
  ) {
    return ok(
      await this.analysisService.classCompare(
        currentUser,
        examId,
        gradeId ? Number(gradeId) : undefined,
      ),
    );
  }

  @Get('exams/:examId/subject-breakdown')
  async subjectBreakdown(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('examId', ParseIntPipe) examId: number,
  ) {
    return ok(await this.analysisService.subjectBreakdown(currentUser, examId));
  }
}
