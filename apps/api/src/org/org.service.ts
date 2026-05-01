import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EntityStatus, Prisma, UserRole } from '@prisma/client';
import { AuthenticatedUser } from '../common/types/auth-user';
import { PrismaService } from '../prisma/prisma.service';
import { BatchCreateClassesDto } from './dto/batch-create-classes.dto';
import { CreateClassDto } from './dto/create-class.dto';
import { CreateGradeDto } from './dto/create-grade.dto';
import { CreateStudentDto } from './dto/create-student.dto';
import { CreateSubjectDto } from './dto/create-subject.dto';
import { CreateTeacherDto } from './dto/create-teacher.dto';
import { QueryClassesDto } from './dto/query-classes.dto';
import { QueryGradesDto } from './dto/query-grades.dto';
import { QueryStudentsDto } from './dto/query-students.dto';
import { QuerySubjectsDto } from './dto/query-subjects.dto';
import { QueryTeachersDto } from './dto/query-teachers.dto';
import { UpdateClassDto } from './dto/update-class.dto';
import { UpdateGradeDto } from './dto/update-grade.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { UpdateSubjectDto } from './dto/update-subject.dto';
import { UpdateTeacherDto } from './dto/update-teacher.dto';

@Injectable()
export class OrgService {
  constructor(private readonly prisma: PrismaService) {}

  async listGrades(currentUser: AuthenticatedUser, query: QueryGradesDto) {
    const schoolId = this.resolveSchoolScope(currentUser);
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;

    const where: Prisma.GradeWhereInput = {
      ...(schoolId ? { schoolId } : {}),
      ...(query.keyword
        ? { name: { contains: query.keyword, mode: 'insensitive' } }
        : {}),
      ...(query.status ? { status: query.status } : {}),
    };

    const [list, total] = await this.prisma.$transaction([
      this.prisma.grade.findMany({
        where,
        orderBy: { id: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.grade.count({ where }),
    ]);

    return { list, total, page, pageSize };
  }

  async createGrade(currentUser: AuthenticatedUser, dto: CreateGradeDto) {
    const schoolId = this.requireSchoolId(currentUser);

    try {
      return await this.prisma.grade.create({
        data: {
          schoolId,
          name: dto.name,
          stage: dto.stage,
          status: dto.status ?? EntityStatus.ENABLED,
        },
      });
    } catch (error: unknown) {
      this.rethrowConflict(error);
    }
  }

  async updateGrade(
    currentUser: AuthenticatedUser,
    gradeId: number,
    dto: UpdateGradeDto,
  ) {
    const grade = await this.prisma.grade.findUnique({
      where: { id: gradeId },
      select: { id: true, schoolId: true },
    });

    if (!grade) {
      throw new NotFoundException('ORG_404');
    }

    this.ensureTenantAccess(currentUser, grade.schoolId);

    try {
      return await this.prisma.grade.update({
        where: { id: gradeId },
        data: {
          name: dto.name,
          stage: dto.stage,
          status: dto.status,
        },
      });
    } catch (error: unknown) {
      this.rethrowConflict(error);
    }
  }

  async deleteGrade(currentUser: AuthenticatedUser, gradeId: number) {
    const grade = await this.prisma.grade.findUnique({
      where: { id: gradeId },
      select: { id: true, schoolId: true },
    });

    if (!grade) {
      throw new NotFoundException('ORG_404');
    }

    this.ensureTenantAccess(currentUser, grade.schoolId);

    const classesCount = await this.prisma.class.count({
      where: { gradeId },
    });
    if (classesCount > 0) {
      throw new ConflictException('ORG_409');
    }

    await this.prisma.grade.delete({ where: { id: gradeId } });
    return true;
  }

  async listClasses(currentUser: AuthenticatedUser, query: QueryClassesDto) {
    const schoolId = this.resolveSchoolScope(currentUser);
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;

    const where: Prisma.ClassWhereInput = {
      ...(schoolId ? { schoolId } : {}),
      ...(query.gradeId ? { gradeId: query.gradeId } : {}),
      ...(query.keyword
        ? { name: { contains: query.keyword, mode: 'insensitive' } }
        : {}),
      ...(query.status ? { status: query.status } : {}),
    };

    const [list, total] = await this.prisma.$transaction([
      this.prisma.class.findMany({
        where,
        orderBy: { id: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          grade: {
            select: { id: true, name: true },
          },
        },
      }),
      this.prisma.class.count({ where }),
    ]);

    return { list, total, page, pageSize };
  }

  async createClass(currentUser: AuthenticatedUser, dto: CreateClassDto) {
    const schoolId = this.requireSchoolId(currentUser);
    await this.ensureGradeInScope(schoolId, dto.gradeId);

    try {
      return await this.prisma.class.create({
        data: {
          schoolId,
          gradeId: dto.gradeId,
          name: dto.name,
          status: dto.status ?? EntityStatus.ENABLED,
        },
      });
    } catch (error: unknown) {
      this.rethrowConflict(error);
    }
  }

  async batchCreateClasses(
    currentUser: AuthenticatedUser,
    dto: BatchCreateClassesDto,
  ) {
    const schoolId = this.requireSchoolId(currentUser);
    await this.ensureGradeInScope(schoolId, dto.gradeId);

    const uniqueNames = [
      ...new Set(dto.names.map((item) => item.trim())),
    ].filter((item) => item.length > 0);

    const created = [] as Array<{ id: number; name: string; gradeId: number }>;
    for (const name of uniqueNames) {
      try {
        const row = await this.prisma.class.create({
          data: {
            schoolId,
            gradeId: dto.gradeId,
            name,
            status: EntityStatus.ENABLED,
          },
          select: { id: true, name: true, gradeId: true },
        });
        created.push(row);
      } catch (error: unknown) {
        this.rethrowConflict(error);
      }
    }

    return { createdCount: created.length, list: created };
  }

  async updateClass(
    currentUser: AuthenticatedUser,
    classId: number,
    dto: UpdateClassDto,
  ) {
    const target = await this.prisma.class.findUnique({
      where: { id: classId },
      select: { id: true, schoolId: true, gradeId: true },
    });

    if (!target) {
      throw new NotFoundException('ORG_404');
    }

    this.ensureTenantAccess(currentUser, target.schoolId);

    const schoolId = this.requireSchoolId(currentUser, target.schoolId);
    if (dto.gradeId) {
      await this.ensureGradeInScope(schoolId, dto.gradeId);
    }

    try {
      return await this.prisma.class.update({
        where: { id: classId },
        data: {
          name: dto.name,
          gradeId: dto.gradeId,
          status: dto.status,
        },
      });
    } catch (error: unknown) {
      this.rethrowConflict(error);
    }
  }

  async deleteClass(currentUser: AuthenticatedUser, classId: number) {
    const target = await this.prisma.class.findUnique({
      where: { id: classId },
      select: { id: true, schoolId: true },
    });

    if (!target) {
      throw new NotFoundException('ORG_404');
    }

    this.ensureTenantAccess(currentUser, target.schoolId);

    await this.prisma.class.delete({ where: { id: classId } });
    return true;
  }

  async listSubjects(currentUser: AuthenticatedUser, query: QuerySubjectsDto) {
    const schoolId = this.resolveSchoolScope(currentUser);
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;

    const where: Prisma.SubjectWhereInput = {
      ...(schoolId ? { schoolId } : {}),
      ...(query.keyword
        ? { name: { contains: query.keyword, mode: 'insensitive' } }
        : {}),
      ...(query.type ? { type: query.type } : {}),
      ...(query.status ? { status: query.status } : {}),
    };

    const [list, total] = await this.prisma.$transaction([
      this.prisma.subject.findMany({
        where,
        orderBy: { id: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.subject.count({ where }),
    ]);

    return { list, total, page, pageSize };
  }

  async createSubject(currentUser: AuthenticatedUser, dto: CreateSubjectDto) {
    const schoolId = this.requireSchoolId(currentUser);

    try {
      return await this.prisma.subject.create({
        data: {
          schoolId,
          name: dto.name,
          shortName: dto.shortName,
          type: dto.type,
          status: dto.status ?? EntityStatus.ENABLED,
        },
      });
    } catch (error: unknown) {
      this.rethrowConflict(error);
    }
  }

  async updateSubject(
    currentUser: AuthenticatedUser,
    subjectId: number,
    dto: UpdateSubjectDto,
  ) {
    const subject = await this.prisma.subject.findUnique({
      where: { id: subjectId },
      select: { id: true, schoolId: true },
    });

    if (!subject) {
      throw new NotFoundException('ORG_404');
    }

    this.ensureTenantAccess(currentUser, subject.schoolId);

    try {
      return await this.prisma.subject.update({
        where: { id: subjectId },
        data: {
          name: dto.name,
          shortName: dto.shortName,
          type: dto.type,
          status: dto.status,
        },
      });
    } catch (error: unknown) {
      this.rethrowConflict(error);
    }
  }

  async deleteSubject(currentUser: AuthenticatedUser, subjectId: number) {
    const subject = await this.prisma.subject.findUnique({
      where: { id: subjectId },
      select: { id: true, schoolId: true },
    });

    if (!subject) {
      throw new NotFoundException('ORG_404');
    }

    this.ensureTenantAccess(currentUser, subject.schoolId);

    await this.prisma.subject.delete({ where: { id: subjectId } });
    return true;
  }

  async listTeachers(currentUser: AuthenticatedUser, query: QueryTeachersDto) {
    const schoolId = this.resolveSchoolScope(currentUser);
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;

    const where: Prisma.TeacherWhereInput = {
      ...(schoolId ? { schoolId } : {}),
      ...(query.keyword
        ? {
            OR: [
              { name: { contains: query.keyword, mode: 'insensitive' } },
              { phone: { contains: query.keyword, mode: 'insensitive' } },
              { email: { contains: query.keyword, mode: 'insensitive' } },
            ],
          }
        : {}),
      ...(query.status ? { status: query.status } : {}),
    };

    const [list, total] = await this.prisma.$transaction([
      this.prisma.teacher.findMany({
        where,
        orderBy: { id: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.teacher.count({ where }),
    ]);

    return { list, total, page, pageSize };
  }

  async createTeacher(currentUser: AuthenticatedUser, dto: CreateTeacherDto) {
    const schoolId = this.requireSchoolId(currentUser);

    try {
      return await this.prisma.teacher.create({
        data: {
          schoolId,
          name: dto.name,
          gender: dto.gender,
          phone: dto.phone,
          email: dto.email,
          status: dto.status ?? EntityStatus.ENABLED,
        },
      });
    } catch (error: unknown) {
      this.rethrowConflict(error);
    }
  }

  async updateTeacher(
    currentUser: AuthenticatedUser,
    teacherId: number,
    dto: UpdateTeacherDto,
  ) {
    const target = await this.prisma.teacher.findUnique({
      where: { id: teacherId },
      select: { id: true, schoolId: true },
    });

    if (!target) {
      throw new NotFoundException('ORG_404');
    }

    this.ensureTenantAccess(currentUser, target.schoolId);

    return this.prisma.teacher.update({
      where: { id: teacherId },
      data: {
        name: dto.name,
        gender: dto.gender,
        phone: dto.phone,
        email: dto.email,
        status: dto.status,
      },
    });
  }

  async deleteTeacher(currentUser: AuthenticatedUser, teacherId: number) {
    const target = await this.prisma.teacher.findUnique({
      where: { id: teacherId },
      select: { id: true, schoolId: true },
    });

    if (!target) {
      throw new NotFoundException('ORG_404');
    }

    this.ensureTenantAccess(currentUser, target.schoolId);
    await this.prisma.teacher.delete({ where: { id: teacherId } });
    return true;
  }

  async listStudents(currentUser: AuthenticatedUser, query: QueryStudentsDto) {
    const schoolId = this.resolveSchoolScope(currentUser);
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;

    const where: Prisma.StudentWhereInput = {
      ...(schoolId ? { schoolId } : {}),
      ...(query.gradeId ? { gradeId: query.gradeId } : {}),
      ...(query.classId ? { classId: query.classId } : {}),
      ...(query.keyword
        ? {
            OR: [
              { name: { contains: query.keyword, mode: 'insensitive' } },
              { studentNo: { contains: query.keyword, mode: 'insensitive' } },
            ],
          }
        : {}),
      ...(query.status ? { status: query.status } : {}),
    };

    const [list, total] = await this.prisma.$transaction([
      this.prisma.student.findMany({
        where,
        orderBy: { id: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          grade: { select: { id: true, name: true } },
          class: { select: { id: true, name: true } },
        },
      }),
      this.prisma.student.count({ where }),
    ]);

    return { list, total, page, pageSize };
  }

  async createStudent(currentUser: AuthenticatedUser, dto: CreateStudentDto) {
    const schoolId = this.requireSchoolId(currentUser);
    await this.ensureGradeInScope(schoolId, dto.gradeId);
    await this.ensureClassInScope(schoolId, dto.classId, dto.gradeId);

    try {
      return await this.prisma.student.create({
        data: {
          schoolId,
          studentNo: dto.studentNo,
          name: dto.name,
          gender: dto.gender,
          gradeId: dto.gradeId,
          classId: dto.classId,
          status: dto.status ?? EntityStatus.ENABLED,
        },
      });
    } catch (error: unknown) {
      this.rethrowConflict(error);
    }
  }

  async updateStudent(
    currentUser: AuthenticatedUser,
    studentId: number,
    dto: UpdateStudentDto,
  ) {
    const target = await this.prisma.student.findUnique({
      where: { id: studentId },
      select: { id: true, schoolId: true, gradeId: true },
    });

    if (!target) {
      throw new NotFoundException('ORG_404');
    }

    this.ensureTenantAccess(currentUser, target.schoolId);
    const schoolId = this.requireSchoolId(currentUser, target.schoolId);
    const nextGradeId = dto.gradeId ?? target.gradeId;

    if (dto.gradeId) {
      await this.ensureGradeInScope(schoolId, dto.gradeId);
    }
    if (dto.classId) {
      await this.ensureClassInScope(schoolId, dto.classId, nextGradeId);
    }

    try {
      return await this.prisma.student.update({
        where: { id: studentId },
        data: {
          studentNo: dto.studentNo,
          name: dto.name,
          gender: dto.gender,
          gradeId: dto.gradeId,
          classId: dto.classId,
          status: dto.status,
        },
      });
    } catch (error: unknown) {
      this.rethrowConflict(error);
    }
  }

  async deleteStudent(currentUser: AuthenticatedUser, studentId: number) {
    const target = await this.prisma.student.findUnique({
      where: { id: studentId },
      select: { id: true, schoolId: true },
    });

    if (!target) {
      throw new NotFoundException('ORG_404');
    }

    this.ensureTenantAccess(currentUser, target.schoolId);
    await this.prisma.student.delete({ where: { id: studentId } });
    return true;
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

    throw new ForbiddenException('ORG_403');
  }

  private requireSchoolId(
    currentUser: AuthenticatedUser,
    fallbackSchoolId?: number,
  ): number {
    if (currentUser.role === UserRole.SCHOOL_ADMIN && currentUser.schoolId) {
      return currentUser.schoolId;
    }

    if (currentUser.role === UserRole.SYSTEM_ADMIN && fallbackSchoolId) {
      return fallbackSchoolId;
    }

    throw new ForbiddenException('ORG_403');
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

    throw new ForbiddenException('ORG_403');
  }

  private async ensureGradeInScope(schoolId: number, gradeId: number) {
    const grade = await this.prisma.grade.findFirst({
      where: { id: gradeId, schoolId },
      select: { id: true },
    });

    if (!grade) {
      throw new NotFoundException('ORG_404');
    }
  }

  private async ensureClassInScope(
    schoolId: number,
    classId: number,
    gradeId?: number,
  ) {
    const targetClass = await this.prisma.class.findFirst({
      where: {
        id: classId,
        schoolId,
        ...(gradeId ? { gradeId } : {}),
      },
      select: { id: true },
    });

    if (!targetClass) {
      throw new NotFoundException('ORG_404');
    }
  }

  private rethrowConflict(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException('ORG_409');
    }

    throw error;
  }
}
