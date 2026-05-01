import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { MarkingTaskStatus, Prisma, UserRole } from '@prisma/client';
import type { AuthenticatedUser } from '../common/types/auth-user';
import { PrismaService } from '../prisma/prisma.service';
import { AssignMarkingTasksDto } from './dto/assign-marking-tasks.dto';
import { QueryMarkingTasksDto } from './dto/query-marking-tasks.dto';
import { ReopenTaskDto } from './dto/reopen-task.dto';
import { SubmitScoreDto } from './dto/submit-score.dto';

@Injectable()
export class MarkingService {
  constructor(private readonly prisma: PrismaService) {}

  async listTasks(currentUser: AuthenticatedUser, query: QueryMarkingTasksDto) {
    const schoolId = this.requireSchoolId(currentUser);
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;

    const where: Prisma.MarkingTaskWhereInput = {
      schoolId,
      ...(query.examId ? { examId: query.examId } : {}),
      ...(query.examSubjectId ? { examSubjectId: query.examSubjectId } : {}),
      ...(query.teacherId ? { teacherId: query.teacherId } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(currentUser.role === UserRole.TEACHER
        ? { teacherId: currentUser.id }
        : {}),
    };

    const [list, total] = await this.prisma.$transaction([
      this.prisma.markingTask.findMany({
        where,
        include: {
          examSubject: { include: { subject: true } },
          entries: {
            select: { id: true, studentId: true, finalSubmitted: true },
          },
        },
        orderBy: { id: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.markingTask.count({ where }),
    ]);

    return { list, total, page, pageSize };
  }

  async assignTasks(
    currentUser: AuthenticatedUser,
    dto: AssignMarkingTasksDto,
  ) {
    const schoolId = this.requireAdminSchoolId(currentUser);
    const examSubject = await this.prisma.examSubject.findUnique({
      where: { id: dto.examSubjectId },
      include: {
        exam: { include: { examClasses: true } },
      },
    });
    if (!examSubject || examSubject.exam.schoolId !== schoolId) {
      throw new NotFoundException('MARK_404');
    }
    if (examSubject.exam.status !== 'MARKING') {
      throw new ConflictException('MARK_409');
    }

    const teacherIds = dto.assignments.map((item) => item.teacherId);
    const teachers = await this.prisma.user.findMany({
      where: {
        id: { in: teacherIds },
        schoolId,
        role: UserRole.TEACHER,
      },
      select: { id: true },
    });
    if (teachers.length !== teacherIds.length) {
      throw new UnprocessableEntityException('MARK_422');
    }

    const classIds = examSubject.exam.examClasses.map((item) => item.classId);
    const allStudentIds = dto.assignments.flatMap((item) => item.studentIds);
    const uniqueStudentIds = [...new Set(allStudentIds)];
    const students = await this.prisma.student.findMany({
      where: {
        schoolId,
        classId: { in: classIds },
        id: { in: uniqueStudentIds },
      },
      select: { id: true },
    });
    if (students.length !== uniqueStudentIds.length) {
      throw new UnprocessableEntityException('MARK_422');
    }
    if (uniqueStudentIds.length !== allStudentIds.length) {
      throw new ConflictException('MARK_409');
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.markingTaskEntry.deleteMany({
        where: { task: { examSubjectId: dto.examSubjectId } },
      });
      await tx.markingTask.deleteMany({
        where: { examSubjectId: dto.examSubjectId },
      });

      for (const assignment of dto.assignments) {
        const task = await tx.markingTask.create({
          data: {
            schoolId,
            examId: examSubject.examId,
            examSubjectId: dto.examSubjectId,
            teacherId: assignment.teacherId,
            status: MarkingTaskStatus.TODO,
          },
        });
        await tx.markingTaskEntry.createMany({
          data: assignment.studentIds.map((studentId) => ({
            taskId: task.id,
            studentId,
          })),
        });
      }

      await this.writeAudit(tx, {
        schoolId,
        operatorId: currentUser.id,
        action: 'assign',
        targetType: 'examSubject',
        targetId: dto.examSubjectId,
        content: '批量分配阅卷任务',
        metadata: dto as unknown as Prisma.InputJsonValue,
      });

      return true;
    });
  }

  async startTask(currentUser: AuthenticatedUser, taskId: number) {
    const task = await this.mustGetTask(currentUser, taskId);
    if (task.status !== MarkingTaskStatus.TODO) {
      throw new ConflictException('MARK_409');
    }

    return this.prisma.markingTask.update({
      where: { id: taskId },
      data: {
        status: MarkingTaskStatus.IN_PROGRESS,
        startedAt: task.startedAt ?? new Date(),
      },
    });
  }

  async detailTask(currentUser: AuthenticatedUser, taskId: number) {
    const task = await this.mustGetTask(currentUser, taskId);
    const full = await this.prisma.markingTask.findUnique({
      where: { id: task.id },
      include: {
        examSubject: {
          include: {
            subject: true,
            exam: true,
          },
        },
        entries: {
          include: {
            task: false,
          },
        },
      },
    });
    if (!full) {
      throw new NotFoundException('MARK_404');
    }

    const submitted = full.entries.filter((item) => item.finalSubmitted).length;
    return {
      ...full,
      progress: {
        totalStudents: full.entries.length,
        submittedStudents: submitted,
      },
    };
  }

  async submitScore(
    currentUser: AuthenticatedUser,
    taskId: number,
    dto: SubmitScoreDto,
  ) {
    const task = await this.mustGetTask(currentUser, taskId);
    if (task.status !== MarkingTaskStatus.IN_PROGRESS) {
      throw new ConflictException('MARK_409');
    }

    const entry = await this.prisma.markingTaskEntry.findUnique({
      where: { taskId_studentId: { taskId, studentId: dto.studentId } },
      include: { task: { include: { examSubject: true } } },
    });
    if (!entry) {
      throw new NotFoundException('MARK_404');
    }

    const total = dto.scores.reduce((acc, item) => acc + item.score, 0);
    if (total > Number(entry.task.examSubject.fullScore)) {
      throw new UnprocessableEntityException('MARK_422');
    }

    return this.prisma.markingTaskEntry.update({
      where: { taskId_studentId: { taskId, studentId: dto.studentId } },
      data: {
        scores: dto.scores as unknown as Prisma.InputJsonValue,
        totalScore: total,
        finalSubmitted: dto.finalSubmit,
        submittedAt: dto.finalSubmit ? new Date() : null,
        version: { increment: 1 },
      },
    });
  }

  async finishTask(currentUser: AuthenticatedUser, taskId: number) {
    const task = await this.mustGetTask(currentUser, taskId);
    if (task.status !== MarkingTaskStatus.IN_PROGRESS) {
      throw new ConflictException('MARK_409');
    }
    const pendingCount = await this.prisma.markingTaskEntry.count({
      where: { taskId, finalSubmitted: false },
    });
    if (pendingCount > 0) {
      throw new UnprocessableEntityException('MARK_422');
    }

    return this.prisma.$transaction(async (tx) => {
      const updatedTask = await tx.markingTask.update({
        where: { id: taskId },
        data: { status: MarkingTaskStatus.DONE, finishedAt: new Date() },
      });
      const subjectPending = await tx.markingTask.count({
        where: {
          examSubjectId: task.examSubjectId,
          status: { not: MarkingTaskStatus.DONE },
        },
      });
      if (subjectPending === 0) {
        await tx.examSubject.update({
          where: { id: task.examSubjectId },
          data: { markingCompletedAt: new Date() },
        });
      }
      return updatedTask;
    });
  }

  async reopenTask(
    currentUser: AuthenticatedUser,
    taskId: number,
    dto: ReopenTaskDto,
  ) {
    const schoolId = this.requireAdminSchoolId(currentUser);
    const task = await this.prisma.markingTask.findUnique({
      where: { id: taskId },
    });
    if (!task || task.schoolId !== schoolId) {
      throw new NotFoundException('MARK_404');
    }
    if (task.status !== MarkingTaskStatus.DONE) {
      throw new ConflictException('MARK_409');
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.markingTask.update({
        where: { id: taskId },
        data: { status: MarkingTaskStatus.IN_PROGRESS, finishedAt: null },
      });
      await tx.examSubject.update({
        where: { id: task.examSubjectId },
        data: { markingCompletedAt: null },
      });
      await this.writeAudit(tx, {
        schoolId,
        operatorId: currentUser.id,
        action: 'reopen',
        targetType: 'markingTask',
        targetId: taskId,
        content: '回退阅卷任务',
        metadata: { reason: dto.reason },
      });
      return updated;
    });
  }

  async examSubjectProgress(
    currentUser: AuthenticatedUser,
    examSubjectId: number,
  ) {
    const schoolId = this.requireSchoolId(currentUser);
    const examSubject = await this.prisma.examSubject.findUnique({
      where: { id: examSubjectId },
      include: { exam: true },
    });
    if (!examSubject || examSubject.exam.schoolId !== schoolId) {
      throw new NotFoundException('MARK_404');
    }

    const tasks = await this.prisma.markingTask.findMany({
      where: { examSubjectId, schoolId },
      include: { entries: true },
    });

    const totalStudents = tasks.reduce(
      (acc, task) => acc + task.entries.length,
      0,
    );
    const submittedStudents = tasks.reduce(
      (acc, task) =>
        acc + task.entries.filter((item) => item.finalSubmitted).length,
      0,
    );
    const stats = {
      todo: tasks.filter((item) => item.status === MarkingTaskStatus.TODO)
        .length,
      inProgress: tasks.filter(
        (item) => item.status === MarkingTaskStatus.IN_PROGRESS,
      ).length,
      done: tasks.filter((item) => item.status === MarkingTaskStatus.DONE)
        .length,
    };

    return {
      examSubjectId,
      totalStudents,
      submittedStudents,
      progressRate: totalStudents === 0 ? 0 : submittedStudents / totalStudents,
      taskStats: stats,
    };
  }

  private async mustGetTask(currentUser: AuthenticatedUser, taskId: number) {
    const schoolId = this.requireSchoolId(currentUser);
    const task = await this.prisma.markingTask.findUnique({
      where: { id: taskId },
    });
    if (!task || task.schoolId !== schoolId) {
      throw new NotFoundException('MARK_404');
    }
    if (
      currentUser.role === UserRole.TEACHER &&
      task.teacherId !== currentUser.id
    ) {
      throw new ForbiddenException('MARK_403');
    }
    return task;
  }

  private requireSchoolId(currentUser: AuthenticatedUser): number {
    if (currentUser.schoolId) {
      return currentUser.schoolId;
    }
    throw new ForbiddenException('MARK_403');
  }

  private requireAdminSchoolId(currentUser: AuthenticatedUser): number {
    if (currentUser.role !== UserRole.SCHOOL_ADMIN || !currentUser.schoolId) {
      throw new ForbiddenException('MARK_403');
    }
    return currentUser.schoolId;
  }

  private async writeAudit(
    tx: Prisma.TransactionClient,
    payload: {
      schoolId: number;
      operatorId: number;
      action: string;
      targetType: string;
      targetId: number;
      content: string;
      metadata?: Prisma.InputJsonValue;
    },
  ) {
    await tx.auditLog.create({
      data: {
        schoolId: payload.schoolId,
        operatorId: payload.operatorId,
        module: 'marking',
        action: payload.action,
        targetType: payload.targetType,
        targetId: payload.targetId,
        content: payload.content,
        metadata: payload.metadata,
      },
    });
  }
}
