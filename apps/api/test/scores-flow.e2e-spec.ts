import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import {
  EntityStatus,
  ExamStatus,
  MarkingTaskStatus,
  PrismaClient,
  ScorePublishStatus,
  UserRole,
} from '@prisma/client';
import * as argon2 from 'argon2';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Scores flow (e2e)', () => {
  let app: INestApplication;
  const prisma = new PrismaClient();
  const suffix = Date.now().toString();

  const school = { code: `SCORE_A_${suffix}`, name: `Score School ${suffix}` };
  const admin = {
    username: `score_admin_${suffix}`,
    password: 'ScoreAdmin123',
  };
  const teacher = {
    username: `score_teacher_${suffix}`,
    password: 'ScoreTeacher123',
  };

  let schoolId = 0;
  let gradeId = 0;
  let classId = 0;
  let adminId = 0;
  let teacherId = 0;
  let examId = 0;
  let examSubjectId = 0;
  let studentAId = 0;
  let studentBId = 0;
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
    const subject = await prisma.subject.create({
      data: { schoolId, name: `数学-${suffix}`, status: EntityStatus.ENABLED },
      select: { id: true },
    });

    const sA = await prisma.student.create({
      data: {
        schoolId,
        studentNo: `SA-${suffix}`,
        name: `学生A-${suffix}`,
        gradeId,
        classId,
        status: EntityStatus.ENABLED,
      },
      select: { id: true },
    });
    studentAId = sA.id;
    const sB = await prisma.student.create({
      data: {
        schoolId,
        studentNo: `SB-${suffix}`,
        name: `学生B-${suffix}`,
        gradeId,
        classId,
        status: EntityStatus.ENABLED,
      },
      select: { id: true },
    });
    studentBId = sB.id;

    const createdAdmin = await prisma.user.create({
      data: {
        username: admin.username,
        passwordHash: await argon2.hash(admin.password),
        realName: 'Score Admin',
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
        realName: 'Score Teacher',
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
        startDate: new Date('2026-06-10'),
        endDate: new Date('2026-06-11'),
        status: ExamStatus.PENDING_PUBLISH,
        createdBy: adminId,
      },
      select: { id: true },
    });
    examId = createdExam.id;
    await prisma.examClass.create({ data: { examId, classId } });
    const es = await prisma.examSubject.create({
      data: {
        examId,
        subjectId: subject.id,
        fullScore: 100,
        markingCompletedAt: new Date(),
      },
      select: { id: true },
    });
    examSubjectId = es.id;

    const task = await prisma.markingTask.create({
      data: {
        schoolId,
        examId,
        examSubjectId,
        teacherId,
        status: MarkingTaskStatus.DONE,
      },
      select: { id: true },
    });
    await prisma.markingTaskEntry.createMany({
      data: [
        {
          taskId: task.id,
          studentId: studentAId,
          finalSubmitted: true,
          totalScore: 88,
        },
        {
          taskId: task.id,
          studentId: studentBId,
          finalSubmitted: true,
          totalScore: 76,
        },
      ],
    });

    adminToken = await login(app, admin.username, admin.password);
    teacherToken = await login(app, teacher.username, teacher.password);
  });

  afterAll(async () => {
    await prisma.examStudentSubjectScore.deleteMany({ where: { examId } });
    await prisma.examStudentScore.deleteMany({ where: { examId } });
    await prisma.markingTaskEntry.deleteMany({ where: { task: { examId } } });
    await prisma.markingTask.deleteMany({ where: { examId } });
    await prisma.auditLog.deleteMany({ where: { module: 'scores' } });
    await prisma.examSubject.deleteMany({ where: { id: examSubjectId } });
    await prisma.examClass.deleteMany({ where: { examId } });
    await prisma.exam.deleteMany({ where: { id: examId } });
    await prisma.user.deleteMany({
      where: { username: { in: [admin.username, teacher.username] } },
    });
    await prisma.student.deleteMany({
      where: { id: { in: [studentAId, studentBId] } },
    });
    await prisma.class.deleteMany({ where: { id: classId } });
    await prisma.grade.deleteMany({ where: { id: gradeId } });
    await prisma.subject.deleteMany({
      where: { schoolId, name: `数学-${suffix}` },
    });
    await prisma.school.deleteMany({ where: { id: schoolId } });
    await prisma.$disconnect();
    await app.close();
  });

  it('recalculate -> list -> detail -> publish -> unpublish', async () => {
    const server = app.getHttpServer() as Parameters<typeof request>[0];

    await request(server)
      .post(`/api/v1/scores/exams/${examId}/recalculate`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(201)
      .expect((res) => {
        const body = res.body as { data: { recalculatedStudents: number } };
        expect(body.data.recalculatedStudents).toBe(2);
      });

    await request(server)
      .get(`/api/v1/scores/exams/${examId}`)
      .set('Authorization', `Bearer ${teacherToken}`)
      .expect(200)
      .expect((res) => {
        const body = res.body as { data: { total: number } };
        expect(body.data.total).toBe(2);
      });

    await request(server)
      .get(`/api/v1/scores/exams/${examId}/students/${studentAId}`)
      .set('Authorization', `Bearer ${teacherToken}`)
      .expect(200)
      .expect((res) => {
        const body = res.body as { data: { total: { studentId: number } } };
        expect(body.data.total.studentId).toBe(studentAId);
      });

    await request(server)
      .post(`/api/v1/scores/exams/${examId}/publish`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ publishNote: '期中成绩正式发布' })
      .expect(201);

    const published = await prisma.exam.findUnique({ where: { id: examId } });
    expect(published?.publishStatus).toBe(ScorePublishStatus.PUBLISHED);
    expect(published?.status).toBe(ExamStatus.PUBLISHED);

    await request(server)
      .post(`/api/v1/scores/exams/${examId}/unpublish`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reason: '复核后重发' })
      .expect(201);

    const unpublished = await prisma.exam.findUnique({ where: { id: examId } });
    expect(unpublished?.publishStatus).toBe(ScorePublishStatus.UNPUBLISHED);
    expect(unpublished?.status).toBe(ExamStatus.PENDING_PUBLISH);
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
