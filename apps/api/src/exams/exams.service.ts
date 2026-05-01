import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ExamStatus, Prisma, UserRole } from '@prisma/client';
import type { AuthenticatedUser } from '../common/types/auth-user';
import { PrismaService } from '../prisma/prisma.service';
import { ChangeExamStatusDto } from './dto/change-exam-status.dto';
import { CreateExamDto } from './dto/create-exam.dto';
import { DeleteExamDto } from './dto/delete-exam.dto';
import { QueryExamsDto } from './dto/query-exams.dto';
import { SetExamClassesDto } from './dto/set-exam-classes.dto';
import { SetExamSubjectsDto } from './dto/set-exam-subjects.dto';
import { UnpublishExamDto } from './dto/unpublish-exam.dto';
import { UpdateExamDto } from './dto/update-exam.dto';

@Injectable()
export class ExamsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(currentUser: AuthenticatedUser, query: QueryExamsDto) {
    const schoolId = this.resolveSchoolScope(currentUser);
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where: Prisma.ExamWhereInput = {
      deletedAt: null,
      ...(schoolId ? { schoolId } : {}),
      ...(query.keyword
        ? { name: { contains: query.keyword, mode: 'insensitive' } }
        : {}),
      ...(query.examType ? { examType: query.examType } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.startDate || query.endDate
        ? {
            AND: [
              ...(query.startDate
                ? [{ startDate: { gte: new Date(query.startDate) } }]
                : []),
              ...(query.endDate
                ? [{ endDate: { lte: new Date(query.endDate) } }]
                : []),
            ],
          }
        : {}),
    };

    const [list, total] = await this.prisma.$transaction([
      this.prisma.exam.findMany({
        where,
        orderBy: { id: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.exam.count({ where }),
    ]);

    return { list, total, page, pageSize };
  }

  async create(currentUser: AuthenticatedUser, dto: CreateExamDto) {
    const schoolId = this.requireSchoolId(currentUser);
    this.ensureDateRange(dto.startDate, dto.endDate);
    await this.ensureClassesInScope(schoolId, dto.classIds);

    try {
      return await this.prisma.$transaction(async (tx) => {
        const exam = await tx.exam.create({
          data: {
            schoolId,
            name: dto.name,
            examType: dto.examType,
            startDate: new Date(dto.startDate),
            endDate: new Date(dto.endDate),
            createdBy: currentUser.id,
            status: ExamStatus.CREATED,
          },
        });

        await tx.examClass.createMany({
          data: dto.classIds.map((classId) => ({
            examId: exam.id,
            classId,
          })),
        });

        await this.writeAuditLog(tx, {
          schoolId,
          operatorId: currentUser.id,
          action: 'create',
          targetId: exam.id,
          content: `创建考试：${exam.name}`,
          metadata: {
            examType: dto.examType,
            classIds: dto.classIds,
          },
        });

        return exam;
      });
    } catch (error: unknown) {
      this.rethrowConflict(error);
    }
  }

  async detail(currentUser: AuthenticatedUser, examId: number) {
    const exam = await this.prisma.exam.findFirst({
      where: { id: examId, deletedAt: null },
      include: {
        examClasses: {
          include: {
            class: {
              select: { id: true, name: true, gradeId: true },
            },
          },
        },
        examSubjects: {
          include: {
            subject: { select: { id: true, name: true, shortName: true } },
          },
        },
      },
    });

    if (!exam) {
      throw new NotFoundException('EXAM_404');
    }

    this.ensureTenantAccess(currentUser, exam.schoolId);
    return exam;
  }

  async update(
    currentUser: AuthenticatedUser,
    examId: number,
    dto: UpdateExamDto,
  ) {
    const exam = await this.mustGetExam(currentUser, examId);
    if (exam.status === ExamStatus.PUBLISHED) {
      throw new ConflictException('EXAM_409');
    }

    if (dto.startDate || dto.endDate) {
      this.ensureDateRange(
        dto.startDate ?? exam.startDate.toISOString(),
        dto.endDate ?? exam.endDate.toISOString(),
      );
    }

    return this.prisma.exam.update({
      where: { id: examId },
      data: {
        name: dto.name,
        examType: dto.examType,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
      },
    });
  }

  async setClasses(
    currentUser: AuthenticatedUser,
    examId: number,
    dto: SetExamClassesDto,
  ) {
    const exam = await this.mustGetExam(currentUser, examId);
    await this.ensureClassesInScope(exam.schoolId, dto.classIds);

    return this.prisma.$transaction(async (tx) => {
      await tx.examClass.deleteMany({ where: { examId } });
      await tx.examClass.createMany({
        data: dto.classIds.map((classId) => ({ examId, classId })),
      });

      return true;
    });
  }

  async setSubjects(
    currentUser: AuthenticatedUser,
    examId: number,
    dto: SetExamSubjectsDto,
  ) {
    const exam = await this.mustGetExam(currentUser, examId);
    await this.ensureSubjectsInScope(
      exam.schoolId,
      dto.subjects.map((item) => item.subjectId),
    );

    const distinctSubjectIds = new Set(
      dto.subjects.map((item) => item.subjectId),
    );
    if (distinctSubjectIds.size !== dto.subjects.length) {
      throw new ConflictException('EXAM_409');
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.examSubject.deleteMany({ where: { examId } });
      await tx.examSubject.createMany({
        data: dto.subjects.map((item) => ({
          examId,
          subjectId: item.subjectId,
          fullScore: item.fullScore,
        })),
      });

      return true;
    });
  }

  async changeStatus(
    currentUser: AuthenticatedUser,
    examId: number,
    dto: ChangeExamStatusDto,
  ) {
    const exam = await this.mustGetExam(currentUser, examId);
    this.assertStatusTransition(exam.status, dto.targetStatus);

    if (dto.targetStatus === ExamStatus.MARKING) {
      const classCount = await this.prisma.examClass.count({
        where: { examId },
      });
      const subjectCount = await this.prisma.examSubject.count({
        where: { examId },
      });
      if (classCount === 0 || subjectCount === 0) {
        throw new UnprocessableEntityException('EXAM_422');
      }
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.exam.update({
        where: { id: examId },
        data: { status: dto.targetStatus },
      });
      await this.writeAuditLog(tx, {
        schoolId: exam.schoolId,
        operatorId: currentUser.id,
        action: 'change-status',
        targetId: examId,
        content: `考试状态流转：${exam.status} -> ${dto.targetStatus}`,
        metadata: { from: exam.status, to: dto.targetStatus },
      });
      return updated;
    });
  }

  async publish(currentUser: AuthenticatedUser, examId: number) {
    const exam = await this.mustGetExam(currentUser, examId);
    if (exam.status !== ExamStatus.PENDING_PUBLISH) {
      throw new ConflictException('EXAM_409');
    }
    const completedMarkedSubjectCount = await this.prisma.examSubject.count({
      where: { examId, markingCompletedAt: { not: null } },
    });
    if (completedMarkedSubjectCount === 0) {
      throw new UnprocessableEntityException('EXAM_422');
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.exam.update({
        where: { id: examId },
        data: { status: ExamStatus.PUBLISHED },
      });
      await this.writeAuditLog(tx, {
        schoolId: exam.schoolId,
        operatorId: currentUser.id,
        action: 'publish',
        targetId: examId,
        content: '发布考试成绩',
        metadata: { completedMarkedSubjectCount },
      });
      return updated;
    });
  }

  async unpublish(
    currentUser: AuthenticatedUser,
    examId: number,
    dto: UnpublishExamDto,
  ) {
    const exam = await this.mustGetExam(currentUser, examId);
    if (exam.status !== ExamStatus.PUBLISHED) {
      throw new ConflictException('EXAM_409');
    }
    // 预留审计日志字段，当前版本先完成状态回退
    if (!dto.reason.trim()) {
      throw new UnprocessableEntityException('EXAM_422');
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.exam.update({
        where: { id: examId },
        data: { status: ExamStatus.PENDING_PUBLISH },
      });
      await this.writeAuditLog(tx, {
        schoolId: exam.schoolId,
        operatorId: currentUser.id,
        action: 'unpublish',
        targetId: examId,
        content: '撤回已发布考试',
        metadata: { reason: dto.reason },
      });
      return updated;
    });
  }

  async remove(
    currentUser: AuthenticatedUser,
    examId: number,
    dto: DeleteExamDto,
  ) {
    const exam = await this.mustGetExam(currentUser, examId);
    if (
      exam.status === ExamStatus.PUBLISHED ||
      exam.status === ExamStatus.MARKING
    ) {
      throw new ConflictException('EXAM_409');
    }

    return this.prisma.$transaction(async (tx) => {
      const deleted = await tx.exam.update({
        where: { id: examId },
        data: { deletedAt: new Date() },
      });
      await this.writeAuditLog(tx, {
        schoolId: exam.schoolId,
        operatorId: currentUser.id,
        action: 'delete',
        targetId: examId,
        content: `软删除考试：${exam.name}`,
        metadata: { reason: dto.reason ?? null },
      });
      return deleted;
    });
  }

  private async mustGetExam(currentUser: AuthenticatedUser, examId: number) {
    const exam = await this.prisma.exam.findFirst({
      where: { id: examId, deletedAt: null },
    });
    if (!exam) {
      throw new NotFoundException('EXAM_404');
    }
    this.ensureTenantAccess(currentUser, exam.schoolId);
    return exam;
  }

  private ensureDateRange(startDate: string, endDate: string) {
    if (new Date(startDate).getTime() > new Date(endDate).getTime()) {
      throw new UnprocessableEntityException('EXAM_422');
    }
  }

  private assertStatusTransition(from: ExamStatus, to: ExamStatus) {
    const allowed = new Map<ExamStatus, ExamStatus[]>([
      [ExamStatus.CREATED, [ExamStatus.MARKING]],
      [ExamStatus.MARKING, [ExamStatus.PENDING_PUBLISH]],
      [ExamStatus.PENDING_PUBLISH, [ExamStatus.PUBLISHED, ExamStatus.MARKING]],
      [ExamStatus.PUBLISHED, []],
    ]);

    if (!allowed.get(from)?.includes(to)) {
      throw new ConflictException('EXAM_409');
    }
  }

  private resolveSchoolScope(
    currentUser: AuthenticatedUser,
  ): number | undefined {
    if (currentUser.role === UserRole.SYSTEM_ADMIN) {
      return undefined;
    }
    if (currentUser.role === UserRole.SCHOOL_ADMIN && currentUser.schoolId) {
      return currentUser.schoolId;
    }
    throw new ForbiddenException('EXAM_403');
  }

  private requireSchoolId(currentUser: AuthenticatedUser): number {
    if (currentUser.role === UserRole.SCHOOL_ADMIN && currentUser.schoolId) {
      return currentUser.schoolId;
    }
    throw new ForbiddenException('EXAM_403');
  }

  private ensureTenantAccess(currentUser: AuthenticatedUser, schoolId: number) {
    if (currentUser.role === UserRole.SYSTEM_ADMIN) {
      return;
    }
    if (
      currentUser.role === UserRole.SCHOOL_ADMIN &&
      currentUser.schoolId === schoolId
    ) {
      return;
    }
    throw new ForbiddenException('EXAM_403');
  }

  private async ensureClassesInScope(schoolId: number, classIds: number[]) {
    const rows = await this.prisma.class.findMany({
      where: { schoolId, id: { in: classIds } },
      select: { id: true },
    });
    if (rows.length !== classIds.length) {
      throw new UnprocessableEntityException('EXAM_422');
    }
  }

  private async ensureSubjectsInScope(schoolId: number, subjectIds: number[]) {
    const rows = await this.prisma.subject.findMany({
      where: { schoolId, id: { in: subjectIds } },
      select: { id: true },
    });
    if (rows.length !== subjectIds.length) {
      throw new UnprocessableEntityException('EXAM_422');
    }
  }

  private rethrowConflict(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException('EXAM_409');
    }
    throw error;
  }

  private async writeAuditLog(
    tx: Prisma.TransactionClient,
    payload: {
      schoolId: number;
      operatorId: number;
      action: string;
      targetId: number;
      content: string;
      metadata?: Prisma.InputJsonValue;
    },
  ) {
    await tx.auditLog.create({
      data: {
        schoolId: payload.schoolId,
        operatorId: payload.operatorId,
        module: 'exam',
        action: payload.action,
        targetType: 'exam',
        targetId: payload.targetId,
        content: payload.content,
        metadata: payload.metadata,
      },
    });
  }
}
