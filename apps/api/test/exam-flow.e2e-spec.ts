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

describe('Exam flow (e2e)', () => {
  let app: INestApplication;
  const prisma = new PrismaClient();

  const suffix = Date.now().toString();
  const school = { code: `EXAM_A_${suffix}`, name: `Exam School ${suffix}` };
  const schoolAdmin = {
    username: `exam_admin_${suffix}`,
    password: 'ExamAdmin123',
  };

  let schoolId = 0;
  let gradeId = 0;
  let classId = 0;
  let subjectId = 0;
  let token = '';

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
      data: {
        schoolId,
        name: `高一-${suffix}`,
        status: EntityStatus.ENABLED,
      },
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

    const createdSubject = await prisma.subject.create({
      data: {
        schoolId,
        name: `数学-${suffix}`,
        shortName: '数学',
        status: EntityStatus.ENABLED,
      },
      select: { id: true },
    });
    subjectId = createdSubject.id;

    await prisma.user.create({
      data: {
        username: schoolAdmin.username,
        passwordHash: await argon2.hash(schoolAdmin.password),
        realName: 'Exam Admin',
        role: UserRole.SCHOOL_ADMIN,
        schoolId,
        status: EntityStatus.ENABLED,
      },
    });

    token = await login(app, schoolAdmin.username, schoolAdmin.password);
  });

  afterAll(async () => {
    const exams = await prisma.exam.findMany({
      where: { schoolId },
      select: { id: true },
    });
    const examIds = exams.map((item) => item.id);
    if (examIds.length > 0) {
      await prisma.examSubject.deleteMany({
        where: { examId: { in: examIds } },
      });
      await prisma.examClass.deleteMany({ where: { examId: { in: examIds } } });
      await prisma.auditLog.deleteMany({
        where: { targetType: 'exam', targetId: { in: examIds } },
      });
      await prisma.exam.deleteMany({ where: { id: { in: examIds } } });
    }

    await prisma.user.deleteMany({ where: { username: schoolAdmin.username } });
    await prisma.subject.deleteMany({ where: { id: subjectId } });
    await prisma.class.deleteMany({ where: { id: classId } });
    await prisma.grade.deleteMany({ where: { id: gradeId } });
    await prisma.school.deleteMany({ where: { id: schoolId } });

    await prisma.$disconnect();
    await app.close();
  });

  it('publish requires completed marking subject', async () => {
    const server = app.getHttpServer() as Parameters<typeof request>[0];

    const createRes = await request(server)
      .post('/api/v1/exams')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: `期中-${suffix}`,
        examType: 'MIDTERM',
        startDate: '2026-05-10',
        endDate: '2026-05-12',
        classIds: [classId],
      })
      .expect(201);
    const createdExamId = (createRes.body as { data: { id: number } }).data.id;

    await request(server)
      .post(`/api/v1/exams/${createdExamId}/subjects`)
      .set('Authorization', `Bearer ${token}`)
      .send({ subjects: [{ subjectId, fullScore: 150 }] })
      .expect(201);

    await request(server)
      .post(`/api/v1/exams/${createdExamId}/change-status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ targetStatus: ExamStatus.MARKING })
      .expect(201);

    await request(server)
      .post(`/api/v1/exams/${createdExamId}/change-status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ targetStatus: ExamStatus.PENDING_PUBLISH })
      .expect(201);

    await request(server)
      .post(`/api/v1/exams/${createdExamId}/publish`)
      .set('Authorization', `Bearer ${token}`)
      .expect(422);

    await prisma.examSubject.updateMany({
      where: { examId: createdExamId },
      data: { markingCompletedAt: new Date() },
    });

    await request(server)
      .post(`/api/v1/exams/${createdExamId}/publish`)
      .set('Authorization', `Bearer ${token}`)
      .expect(201)
      .expect((res) => {
        const body = res.body as { code: number; data: { status: ExamStatus } };
        expect(body.code).toBe(0);
        expect(body.data.status).toBe(ExamStatus.PUBLISHED);
      });
  });

  it('delete performs soft delete and hides from list', async () => {
    const server = app.getHttpServer() as Parameters<typeof request>[0];

    const createRes = await request(server)
      .post('/api/v1/exams')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: `月考-${suffix}`,
        examType: 'MONTHLY',
        startDate: '2026-05-20',
        endDate: '2026-05-21',
        classIds: [classId],
      })
      .expect(201);
    const examId = (createRes.body as { data: { id: number } }).data.id;

    await request(server)
      .delete(`/api/v1/exams/${examId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ reason: '录入错误，重新建考' })
      .expect(200);

    await request(server)
      .get('/api/v1/exams')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
      .expect((res) => {
        const body = res.body as { data: { list: Array<{ id: number }> } };
        const ids = body.data.list.map((item) => item.id);
        expect(ids).not.toContain(examId);
      });
  });

  it('cannot delete marking exam', async () => {
    const server = app.getHttpServer() as Parameters<typeof request>[0];

    const createRes = await request(server)
      .post('/api/v1/exams')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: `模拟-${suffix}`,
        examType: 'MOCK',
        startDate: '2026-06-01',
        endDate: '2026-06-02',
        classIds: [classId],
      })
      .expect(201);
    const examId = (createRes.body as { data: { id: number } }).data.id;

    await request(server)
      .post(`/api/v1/exams/${examId}/subjects`)
      .set('Authorization', `Bearer ${token}`)
      .send({ subjects: [{ subjectId, fullScore: 100 }] })
      .expect(201);

    await request(server)
      .post(`/api/v1/exams/${examId}/change-status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ targetStatus: ExamStatus.MARKING })
      .expect(201);

    await request(server)
      .delete(`/api/v1/exams/${examId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ reason: '测试删除限制' })
      .expect(409);
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
