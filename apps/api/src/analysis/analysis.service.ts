import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import type { AuthenticatedUser } from '../common/types/auth-user';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AnalysisService {
  constructor(private readonly prisma: PrismaService) {}

  async examSummary(currentUser: AuthenticatedUser, examId: number) {
    const exam = await this.mustGetExam(examId, currentUser);

    const scores = await this.prisma.examStudentScore.findMany({
      where: { examId, schoolId: exam.schoolId },
      select: { totalScore: true },
    });
    const subjectRows = await this.prisma.examSubject.findMany({
      where: { examId },
      select: { fullScore: true },
    });
    const totalFullScore = subjectRows.reduce(
      (acc, row) => acc + row.fullScore,
      0,
    );
    const passLine = totalFullScore * 0.6;

    const values = scores.map((item) => Number(item.totalScore));
    const studentCount = values.length;
    const sum = values.reduce((acc, val) => acc + val, 0);
    const avgRaw = studentCount === 0 ? 0 : sum / studentCount;
    const avgScore = Number(avgRaw.toFixed(1));
    const maxScore = studentCount === 0 ? 0 : Math.max(...values);
    const minScore = studentCount === 0 ? 0 : Math.min(...values);
    const passCount = values.filter((score) => score >= passLine).length;
    const passRate = studentCount === 0 ? 0 : passCount / studentCount;

    return {
      examId,
      studentCount,
      avgScore,
      maxScore,
      minScore,
      passRate,
    };
  }

  async classCompare(
    currentUser: AuthenticatedUser,
    examId: number,
    gradeId?: number,
  ) {
    const exam = await this.mustGetExam(examId, currentUser);

    const rows = await this.prisma.examStudentScore.findMany({
      where: {
        examId,
        schoolId: exam.schoolId,
        ...(gradeId ? { student: { gradeId } } : {}),
      },
      include: {
        student: {
          select: {
            classId: true,
          },
        },
      },
    });
    const classIds = [...new Set(rows.map((item) => item.student.classId))];
    const classes = await this.prisma.class.findMany({
      where: { id: { in: classIds } },
      select: { id: true, name: true },
    });
    const classNameMap = new Map(classes.map((item) => [item.id, item.name]));

    const subjectRows = await this.prisma.examSubject.findMany({
      where: { examId },
      select: { fullScore: true },
    });
    const passLine =
      subjectRows.reduce((acc, row) => acc + row.fullScore, 0) * 0.6;

    const grouped = new Map<number, number[]>();
    for (const row of rows) {
      const arr = grouped.get(row.student.classId) ?? [];
      arr.push(Number(row.totalScore));
      grouped.set(row.student.classId, arr);
    }

    return [...grouped.entries()]
      .map(([classId, scores]) => {
        const avg = scores.reduce((acc, v) => acc + v, 0) / scores.length;
        const pass = scores.filter((v) => v >= passLine).length;
        return {
          classId,
          className: classNameMap.get(classId) ?? `class-${classId}`,
          avgScore: Number(avg.toFixed(1)),
          passRate: scores.length === 0 ? 0 : pass / scores.length,
        };
      })
      .sort((a, b) => b.avgScore - a.avgScore);
  }

  async subjectBreakdown(currentUser: AuthenticatedUser, examId: number) {
    const exam = await this.mustGetExam(examId, currentUser);
    const rows = await this.prisma.examStudentSubjectScore.findMany({
      where: { examId, schoolId: exam.schoolId },
      include: {
        examSubject: {
          include: { subject: true },
        },
      },
    });

    const grouped = new Map<
      number,
      { name: string; fullScore: number; values: number[] }
    >();
    for (const row of rows) {
      const key = row.examSubjectId;
      const current = grouped.get(key) ?? {
        name: row.examSubject.subject.name,
        fullScore: row.examSubject.fullScore,
        values: [],
      };
      current.values.push(Number(row.score));
      grouped.set(key, current);
    }

    return [...grouped.entries()]
      .map(([examSubjectId, item]) => {
        const count = item.values.length;
        const avg =
          count === 0 ? 0 : item.values.reduce((acc, v) => acc + v, 0) / count;
        const max = count === 0 ? 0 : Math.max(...item.values);
        const min = count === 0 ? 0 : Math.min(...item.values);
        const passLine = item.fullScore * 0.6;
        const passRate =
          count === 0
            ? 0
            : item.values.filter((score) => score >= passLine).length / count;
        return {
          examSubjectId,
          subjectName: item.name,
          avgScore: Number(avg.toFixed(1)),
          maxScore: max,
          minScore: min,
          passRate,
        };
      })
      .sort((a, b) => a.examSubjectId - b.examSubjectId);
  }

  private async mustGetExam(examId: number, currentUser: AuthenticatedUser) {
    if (
      currentUser.role !== UserRole.SCHOOL_ADMIN &&
      currentUser.role !== UserRole.TEACHER
    ) {
      throw new ForbiddenException('SCORE_403');
    }
    const exam = await this.prisma.exam.findFirst({
      where: { id: examId, deletedAt: null },
    });
    if (!exam) {
      throw new NotFoundException('SCORE_404');
    }
    if (!currentUser.schoolId || currentUser.schoolId !== exam.schoolId) {
      throw new ForbiddenException('SCORE_403');
    }
    return exam;
  }
}
