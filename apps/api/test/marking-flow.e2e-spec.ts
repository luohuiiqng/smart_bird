import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import {
  EntityStatus,
  ExamStatus,
  PrismaClient,
  UserRole,
} from '@prisma/client';
import * as argon2 from 'argon2';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Marking flow (e2e)', () => {
  let app: INestApplication;
  const prisma = new PrismaClient();

  const suffix = Date.now().toString();
  const school = { code: `MARK_A_${suffix}`, name: `Mark School ${suffix}` };
  const schoolAdmin = {
    username: `mark_admin_${suffix}`,
    password: 'MarkAdmin123',
  };
  const teacher = {
    username: `mark_teacher_${suffix}`,
    password: 'MarkTeacher123',
  };

  let schoolId = 0;
  let gradeId = 0;
  let classId = 0;
  let studentId = 0;
  let adminId = 0;
  let teacherId = 0;
  let examId = 0;
  let examSubjectId = 0;
  let adminToken = '';
  let teacherToken = '';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix(process.env.API_PREFIX ?? 'api/v1');
    await app.init();

    const createdSchool = await prisma.school.create({
      data: {
        code: school.code,
        name: school.name,
        status: EntityStatus.ENABLED,
      },
      select: { id: true },
    });
    schoolId = createdSchool.id;

    const createdGrade = await prisma.grade.create({
      data: { schoolId, name: `高一-${suffix}`, status: EntityStatus.ENABLED },
      select: { id: true },
    });
    gradeId = createdGrade.id;
    const createdClass = await prisma.class.create({
      data: {
        schoolId,
        gradeId,
        name: `1班-${suffix}`,
        status: EntityStatus.ENABLED,
      },
      select: { id: true },
    });
    classId = createdClass.id;
    const createdStudent = await prisma.student.create({
      data: {
        schoolId,
        studentNo: `MK-${suffix}`,
        name: `学生-${suffix}`,
        gradeId,
        classId,
        status: EntityStatus.ENABLED,
      },
      select: { id: true },
    });
    studentId = createdStudent.id;

    const createdSubject = await prisma.subject.create({
      data: { schoolId, name: `语文-${suffix}`, status: EntityStatus.ENABLED },
      select: { id: true },
    });

    const createdAdmin = await prisma.user.create({
      data: {
        username: schoolAdmin.username,
        passwordHash: await argon2.hash(schoolAdmin.password),
        realName: 'Mark Admin',
        role: UserRole.SCHOOL_ADMIN,
        schoolId,
        status: EntityStatus.ENABLED,
      },
      select: { id: true },
    });
    adminId = createdAdmin.id;
    const createdTeacher = await prisma.user.create({
      data: {
        username: teacher.username,
        passwordHash: await argon2.hash(teacher.password),
        realName: 'Mark Teacher',
        role: UserRole.TEACHER,
        schoolId,
        status: EntityStatus.ENABLED,
      },
      select: { id: true },
    });
    teacherId = createdTeacher.id;

    const createdExam = await prisma.exam.create({
      data: {
        schoolId,
        name: `期中-${suffix}`,
        examType: 'MIDTERM',
        startDate: new Date('2026-06-01'),
        endDate: new Date('2026-06-02'),
        createdBy: adminId,
        status: ExamStatus.MARKING,
      },
      select: { id: true },
    });
    examId = createdExam.id;
    await prisma.examClass.create({
      data: { examId, classId },
    });
    const createdExamSubject = await prisma.examSubject.create({
      data: { examId, subjectId: createdSubject.id, fullScore: 100 },
      select: { id: true },
    });
    examSubjectId = createdExamSubject.id;

    adminToken = await login(app, schoolAdmin.username, schoolAdmin.password);
    teacherToken = await login(app, teacher.username, teacher.password);
  });

  afterAll(async () => {
    await prisma.markingTaskEntry.deleteMany({
      where: { task: { examSubjectId } },
    });
    await prisma.markingTask.deleteMany({ where: { examSubjectId } });
    await prisma.auditLog.deleteMany({ where: { module: 'marking' } });
    await prisma.examSubject.deleteMany({ where: { id: examSubjectId } });
    await prisma.examClass.deleteMany({ where: { examId } });
    await prisma.exam.deleteMany({ where: { id: examId } });
    await prisma.user.deleteMany({
      where: { username: { in: [schoolAdmin.username, teacher.username] } },
    });
    await prisma.student.deleteMany({ where: { id: studentId } });
    await prisma.class.deleteMany({ where: { id: classId } });
    await prisma.grade.deleteMany({ where: { id: gradeId } });
    await prisma.subject.deleteMany({
      where: { schoolId, name: `语文-${suffix}` },
    });
    await prisma.school.deleteMany({ where: { id: schoolId } });
    await prisma.$disconnect();
    await app.close();
  });

  it('assign -> start -> submit -> finish -> progress', async () => {
    const server = app.getHttpServer() as Parameters<typeof request>[0];

    const assignRes = await request(server)
      .post('/api/v1/marking/tasks/assign')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        examSubjectId,
        assignments: [{ teacherId, studentIds: [studentId] }],
      })
      .expect(201);
    expect((assignRes.body as { code: number }).code).toBe(0);

    const listRes = await request(server)
      .get('/api/v1/marking/tasks')
      .set('Authorization', `Bearer ${teacherToken}`)
      .expect(200);
    const tasks = (listRes.body as { data: { list: Array<{ id: number }> } })
      .data.list;
    expect(tasks.length).toBe(1);
    const taskId = tasks[0].id;

    await request(server)
      .post(`/api/v1/marking/tasks/${taskId}/start`)
      .set('Authorization', `Bearer ${teacherToken}`)
      .expect(201);

    await request(server)
      .post(`/api/v1/marking/tasks/${taskId}/submit-score`)
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({
        studentId,
        scores: [
          { questionNo: 1, score: 30 },
          { questionNo: 2, score: 50 },
        ],
        finalSubmit: true,
      })
      .expect(201);

    await request(server)
      .post(`/api/v1/marking/tasks/${taskId}/finish`)
      .set('Authorization', `Bearer ${teacherToken}`)
      .expect(201);

    const progressRes = await request(server)
      .get(`/api/v1/marking/exam-subjects/${examSubjectId}/progress`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    const progress = (
      progressRes.body as {
        data: {
          submittedStudents: number;
          totalStudents: number;
          taskStats: { done: number };
        };
      }
    ).data;
    expect(progress.totalStudents).toBe(1);
    expect(progress.submittedStudents).toBe(1);
    expect(progress.taskStats.done).toBe(1);
  });
});

async function login(
  app: INestApplication,
  username: string,
  password: string,
): Promise<string> {
  const server = app.getHttpServer() as Parameters<typeof request>[0];
  const response = await request(server)
    .post('/api/v1/auth/login')
    .send({ username, password })
    .expect(201);
  const body = response.body as { data: { accessToken: string } };
  return body.data.accessToken;
}
