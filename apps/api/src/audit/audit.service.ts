import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, UserRole } from '@prisma/client';
import type { AuthenticatedUser } from '../common/types/auth-user';
import { PrismaService } from '../prisma/prisma.service';
import { QueryAuditLogsDto } from './dto/query-audit-logs.dto';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async listLogs(currentUser: AuthenticatedUser, query: QueryAuditLogsDto) {
    const schoolId = this.requireSchoolAdmin(currentUser);
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where: Prisma.AuditLogWhereInput = {
      schoolId,
      ...(query.module ? { module: query.module } : {}),
      ...(query.action ? { action: query.action } : {}),
      ...(query.operatorId ? { operatorId: query.operatorId } : {}),
      ...(query.targetType ? { targetType: query.targetType } : {}),
      ...(query.targetId ? { targetId: query.targetId } : {}),
      ...(query.startTime || query.endTime
        ? {
            createdAt: {
              ...(query.startTime ? { gte: new Date(query.startTime) } : {}),
              ...(query.endTime ? { lte: new Date(query.endTime) } : {}),
            },
          }
        : {}),
    };

    const [list, total] = await this.prisma.$transaction([
      this.prisma.auditLog.findMany({
        where,
        include: {
          operator: {
            select: { id: true, username: true, realName: true, role: true },
          },
        },
        orderBy: { id: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.auditLog.count({ where }),
    ]);
    return { list, total, page, pageSize };
  }

  async detailLog(currentUser: AuthenticatedUser, id: number) {
    const schoolId = this.requireSchoolAdmin(currentUser);
    const row = await this.prisma.auditLog.findUnique({
      where: { id },
      include: {
        operator: {
          select: { id: true, username: true, realName: true, role: true },
        },
      },
    });
    if (!row || row.schoolId !== schoolId) {
      throw new NotFoundException('AUDIT_404');
    }
    return row;
  }

  private requireSchoolAdmin(currentUser: AuthenticatedUser) {
    if (currentUser.role === UserRole.SCHOOL_ADMIN && currentUser.schoolId) {
      return currentUser.schoolId;
    }
    throw new ForbiddenException('AUDIT_403');
  }
}
