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
import { AuditService } from './audit.service';
import { QueryAuditLogsDto } from './dto/query-audit-logs.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SCHOOL_ADMIN)
@Controller('audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get('logs')
  async listLogs(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Query() query: QueryAuditLogsDto,
  ) {
    return ok(await this.auditService.listLogs(currentUser, query));
  }

  @Get('logs/:id')
  async detailLog(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return ok(await this.auditService.detailLog(currentUser, id));
  }
}
