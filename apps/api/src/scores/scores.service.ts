import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  ExamStatus,
  Prisma,
  ScorePublishStatus,
  UserRole,
} from '@prisma/client';
import type { AuthenticatedUser } from '../common/types/auth-user';
import { PrismaService } from '../prisma/prisma.service';
import { PublishScoresDto } from './dto/publish-scores.dto';
import { QueryExamScoresDto } from './dto/query-exam-scores.dto';
import { UnpublishScoresDto } from './dto/unpublish-scores.dto';

type StudentAggregate = {
  studentId: number;
  totalScore: number;
  subjectScores: Array<{ examSubjectId: number; score: number }>;
};

@Injectable()
export class ScoresService {
  constructor(private readonly prisma: PrismaService) {}

  async recalculate(currentUser: AuthenticatedUser, examId: number) {
    const exam = await this.mustGetExam(examId, currentUser);
    this.requireAdmin(currentUser);

    const entries = await this.prisma.markingTaskEntry.findMany({
      where: {
        finalSubmitted: true,
        task: { examId, schoolId: exam.schoolId },
      },
      include: {
        task: { select: { examSubjectId: true } },
      },
    });
    if (entries.length === 0) {
      throw new UnprocessableEntityException('SCORE_422');
    }

    const aggMap = new Map<number, StudentAggregate>();
    for (const entry of entries) {
      const studentId = entry.studentId;
      const score = Number(entry.totalScore ?? 0);
      const examSubjectId = entry.task.examSubjectId;

      const existing = aggMap.get(studentId);
      if (!existing) {
        aggMap.set(studentId, {
          studentId,
          totalScore: score,
          subjectScores: [{ examSubjectId, score }],
        });
      } else {
        existing.totalScore += score;
        existing.subjectScores.push({ examSubjectId, score });
      }
    }
    const rows = [...aggMap.values()];
    if (rows.length === 0) {
      throw new UnprocessableEntityException('SCORE_422');
    }

    const students = await this.prisma.student.findMany({
      where: { id: { in: rows.map((item) => item.studentId) } },
      select: { id: true, gradeId: true, classId: true },
    });
    const studentMeta = new Map(students.map((s) => [s.id, s]));
    const classRanks = this.computeRanks(
      rows,
      (item) => studentMeta.get(item.studentId)?.classId,
    );
    const gradeRanks = this.computeRanks(
      rows,
      (item) => studentMeta.get(item.studentId)?.gradeId,
    );

    await this.prisma.$transaction(async (tx) => {
      await tx.examStudentSubjectScore.deleteMany({ where: { examId } });
      await tx.examStudentScore.deleteMany({ where: { examId } });

      for (const row of rows) {
        const total = await tx.examStudentScore.create({
          data: {
            schoolId: exam.schoolId,
            examId,
            studentId: row.studentId,
            totalScore: row.totalScore,
            rankInClass: classRanks.get(row.studentId) ?? null,
            rankInGrade: gradeRanks.get(row.studentId) ?? null,
          },
        });

        for (const subjectRow of row.subjectScores) {
          await tx.examStudentSubjectScore.create({
            data: {
              schoolId: exam.schoolId,
              examId,
              examSubjectId: subjectRow.examSubjectId,
              studentId: row.studentId,
              totalScoreId: total.id,
              score: subjectRow.score,
            },
          });
        }
      }

      await this.writeAudit(tx, {
        schoolId: exam.schoolId,
        operatorId: currentUser.id,
        action: 'recalculate',
        targetId: examId,
        content: '重算考试成绩汇总',
        metadata: {
          recalculatedStudents: rows.length,
        },
      });
    });

    return { examId, recalculatedStudents: rows.length };
  }

  async listExamScores(
    currentUser: AuthenticatedUser,
    examId: number,
    query: QueryExamScoresDto,
  ) {
    const exam = await this.mustGetExam(examId, currentUser);
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const sortBy = query.sortBy ?? 'totalScore';
    const sortOrder = query.sortOrder ?? 'desc';

    const where: Prisma.ExamStudentScoreWhereInput = {
      examId,
      schoolId: exam.schoolId,
      ...(query.gradeId || query.classId || query.keyword
        ? {
            student: {
              ...(query.gradeId ? { gradeId: query.gradeId } : {}),
              ...(query.classId ? { classId: query.classId } : {}),
              ...(query.keyword
                ? { name: { contains: query.keyword, mode: 'insensitive' } }
                : {}),
            },
          }
        : {}),
    };

    const orderBy =
      sortBy === 'totalScore'
        ? ({ totalScore: sortOrder } as const)
        : sortBy === 'rankInClass'
          ? ({ rankInClass: sortOrder } as const)
          : ({ rankInGrade: sortOrder } as const);

    const [list, total] = await this.prisma.$transaction([
      this.prisma.examStudentScore.findMany({
        where,
        include: {
          student: {
            select: {
              id: true,
              name: true,
              studentNo: true,
              gradeId: true,
              classId: true,
            },
          },
        },
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.examStudentScore.count({ where }),
    ]);

    return { list, total, page, pageSize };
  }

  async studentExamScore(
    currentUser: AuthenticatedUser,
    examId: number,
    studentId: number,
  ) {
    const exam = await this.mustGetExam(examId, currentUser);
    const total = await this.prisma.examStudentScore.findUnique({
      where: { examId_studentId: { examId, studentId } },
      include: { student: true },
    });
    if (!total || total.schoolId !== exam.schoolId) {
      throw new NotFoundException('SCORE_404');
    }
    const subjects = await this.prisma.examStudentSubjectScore.findMany({
      where: { examId, studentId, schoolId: exam.schoolId },
      include: {
        examSubject: { include: { subject: true } },
      },
      orderBy: { examSubjectId: 'asc' },
    });
    return { total, subjects };
  }

  async publish(
    currentUser: AuthenticatedUser,
    examId: number,
    dto: PublishScoresDto,
  ) {
    const exam = await this.mustGetExam(examId, currentUser);
    this.requireAdmin(currentUser);
    if (
      exam.status !== ExamStatus.PENDING_PUBLISH ||
      exam.publishStatus === ScorePublishStatus.PUBLISHED
    ) {
      throw new ConflictException('SCORE_409');
    }
    const count = await this.prisma.examStudentScore.count({
      where: { examId },
    });
    if (count === 0) {
      throw new UnprocessableEntityException('SCORE_422');
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.exam.update({
        where: { id: examId },
        data: {
          status: ExamStatus.PUBLISHED,
          publishStatus: ScorePublishStatus.PUBLISHED,
          publishedAt: new Date(),
          publishNote: dto.publishNote ?? null,
        },
      });
      await this.writeAudit(tx, {
        schoolId: exam.schoolId,
        operatorId: currentUser.id,
        action: 'publish',
        targetId: examId,
        content: '发布考试成绩（scores）',
        metadata: {
          publishNote: dto.publishNote ?? null,
        },
      });
      return updated;
    });
  }

  async unpublish(
    currentUser: AuthenticatedUser,
    examId: number,
    dto: UnpublishScoresDto,
  ) {
    const exam = await this.mustGetExam(examId, currentUser);
    this.requireAdmin(currentUser);
    if (exam.publishStatus !== ScorePublishStatus.PUBLISHED) {
      throw new ConflictException('SCORE_409');
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.exam.update({
        where: { id: examId },
        data: {
          status: ExamStatus.PENDING_PUBLISH,
          publishStatus: ScorePublishStatus.UNPUBLISHED,
          publishedAt: null,
        },
      });
      await this.writeAudit(tx, {
        schoolId: exam.schoolId,
        operatorId: currentUser.id,
        action: 'unpublish',
        targetId: examId,
        content: '撤回发布成绩（scores）',
        metadata: { reason: dto.reason },
      });
      return updated;
    });
  }

  private computeRanks(
    rows: StudentAggregate[],
    groupBy: (item: StudentAggregate) => number | undefined,
  ) {
    const byGroup = new Map<number, StudentAggregate[]>();
    for (const row of rows) {
      const group = groupBy(row);
      if (!group) {
        continue;
      }
      const arr = byGroup.get(group) ?? [];
      arr.push(row);
      byGroup.set(group, arr);
    }

    const ranks = new Map<number, number>();
    for (const [, list] of byGroup) {
      list.sort((a, b) => b.totalScore - a.totalScore);
      let rank = 0;
      let prevScore: number | null = null;
      for (let idx = 0; idx < list.length; idx += 1) {
        const item = list[idx];
        if (prevScore === null || item.totalScore !== prevScore) {
          rank = idx + 1;
          prevScore = item.totalScore;
        }
        ranks.set(item.studentId, rank);
      }
    }
    return ranks;
  }

  private async mustGetExam(examId: number, currentUser: AuthenticatedUser) {
    const exam = await this.prisma.exam.findFirst({
      where: {
        id: examId,
        deletedAt: null,
      },
    });
    if (!exam) {
      throw new NotFoundException('SCORE_404');
    }
    if (!currentUser.schoolId || exam.schoolId !== currentUser.schoolId) {
      throw new ForbiddenException('SCORE_403');
    }
    return exam;
  }

  private requireAdmin(currentUser: AuthenticatedUser) {
    if (currentUser.role !== UserRole.SCHOOL_ADMIN) {
      throw new ForbiddenException('SCORE_403');
    }
  }

  private async writeAudit(
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
        module: 'scores',
        action: payload.action,
        targetType: 'exam',
        targetId: payload.targetId,
        content: payload.content,
        metadata: payload.metadata,
      },
    });
  }
}
