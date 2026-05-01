import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import {
  EntityStatus,
  FileCategory,
  PrismaClient,
  UserRole,
} from '@prisma/client';
import * as argon2 from 'argon2';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Files and audit flow (e2e)', () => {
  let app: INestApplication;
  const prisma = new PrismaClient();
  const suffix = Date.now().toString();

  const school = { code: `FILE_A_${suffix}`, name: `File School ${suffix}` };
  const admin = { username: `file_admin_${suffix}`, password: 'FileAdmin123' };
  const teacher = {
    username: `file_teacher_${suffix}`,
    password: 'FileTeacher123',
  };

  let schoolId = 0;
  let adminToken = '';
  let teacherToken = '';
  let fileId = 0;

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

    await prisma.user.createMany({
      data: [
        {
          username: admin.username,
          passwordHash: await argon2.hash(admin.password),
          realName: 'File Admin',
          role: UserRole.SCHOOL_ADMIN,
          schoolId,
          status: EntityStatus.ENABLED,
        },
        {
          username: teacher.username,
          passwordHash: await argon2.hash(teacher.password),
          realName: 'File Teacher',
          role: UserRole.TEACHER,
          schoolId,
          status: EntityStatus.ENABLED,
        },
      ],
    });

    adminToken = await login(app, admin.username, admin.password);
    teacherToken = await login(app, teacher.username, teacher.password);
  });

  afterAll(async () => {
    await prisma.fileAsset.deleteMany({ where: { schoolId } });
    await prisma.auditLog.deleteMany({ where: { schoolId, module: 'files' } });
    await prisma.user.deleteMany({
      where: { username: { in: [admin.username, teacher.username] } },
    });
    await prisma.school.deleteMany({ where: { id: schoolId } });
    await prisma.$disconnect();
    await app.close();
  });

  it('upload -> detail -> presigned -> delete and audit list', async () => {
    const server = app.getHttpServer() as Parameters<typeof request>[0];
    const uploadRes = await request(server)
      .post('/api/v1/files/upload')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({
        category: FileCategory.IMPORT_FILE,
        fileName: `students-${suffix}.xlsx`,
        contentType:
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        size: 1024,
        bizType: 'student-import',
        bizId: 1,
      })
      .expect(201);

    fileId = (uploadRes.body as { data: { fileId: number } }).data.fileId;
    expect(fileId).toBeGreaterThan(0);

    await request(server)
      .get(`/api/v1/files/${fileId}`)
      .set('Authorization', `Bearer ${teacherToken}`)
      .expect(200)
      .expect((res) => {
        const body = res.body as { data: { id: number; fileName: string } };
        expect(body.data.id).toBe(fileId);
      });

    await request(server)
      .get(`/api/v1/files/${fileId}/presigned-url?expiresIn=120`)
      .set('Authorization', `Bearer ${teacherToken}`)
      .expect(200)
      .expect((res) => {
        const body = res.body as { data: { expiresIn: number; url: string } };
        expect(body.data.expiresIn).toBe(120);
        expect(body.data.url.includes('signature=dev-placeholder')).toBe(true);
      });

    await request(server)
      .delete(`/api/v1/files/${fileId}`)
      .set('Authorization', `Bearer ${teacherToken}`)
      .expect(200);

    await request(server)
      .get('/api/v1/audit/logs?module=files')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200)
      .expect((res) => {
        const body = res.body as { data: { total: number } };
        expect(body.data.total).toBeGreaterThanOrEqual(2);
      });
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
