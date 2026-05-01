import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { EntityStatus, PrismaClient, UserRole } from '@prisma/client';
import * as argon2 from 'argon2';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Auth + RBAC (e2e)', () => {
  let app: INestApplication;
  const prisma = new PrismaClient();

  const suffix = Date.now().toString();
  const schoolA = { code: `E2E_A_${suffix}`, name: `E2E School A ${suffix}` };
  const schoolB = { code: `E2E_B_${suffix}`, name: `E2E School B ${suffix}` };

  const schoolAdminA = {
    username: `e2e_school_admin_a_${suffix}`,
    password: 'E2eAdminA123',
    realName: 'E2E School Admin A',
  };
  const systemAdmin = {
    username: `e2e_sys_admin_${suffix}`,
    password: 'E2eSysAdmin123',
    realName: 'E2E System Admin',
  };

  let schoolAId = 0;
  let schoolBId = 0;
  let schoolAdminAToken = '';
  let systemAdminToken = '';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix(process.env.API_PREFIX ?? 'api/v1');
    await app.init();

    const createdSchoolA = await prisma.school.create({
      data: {
        code: schoolA.code,
        name: schoolA.name,
        status: EntityStatus.ENABLED,
      },
      select: { id: true },
    });
    const createdSchoolB = await prisma.school.create({
      data: {
        code: schoolB.code,
        name: schoolB.name,
        status: EntityStatus.ENABLED,
      },
      select: { id: true },
    });
    schoolAId = createdSchoolA.id;
    schoolBId = createdSchoolB.id;

    await prisma.user.create({
      data: {
        username: schoolAdminA.username,
        passwordHash: await argon2.hash(schoolAdminA.password),
        realName: schoolAdminA.realName,
        role: UserRole.SCHOOL_ADMIN,
        schoolId: schoolAId,
        status: EntityStatus.ENABLED,
      },
    });
    await prisma.user.create({
      data: {
        username: systemAdmin.username,
        passwordHash: await argon2.hash(systemAdmin.password),
        realName: systemAdmin.realName,
        role: UserRole.SYSTEM_ADMIN,
        schoolId: null,
        status: EntityStatus.ENABLED,
      },
    });

    schoolAdminAToken = await loginAndGetAccessToken(
      app,
      schoolAdminA.username,
      schoolAdminA.password,
    );
    systemAdminToken = await loginAndGetAccessToken(
      app,
      systemAdmin.username,
      systemAdmin.password,
    );
  });

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: {
        username: {
          in: [schoolAdminA.username, systemAdmin.username],
        },
      },
    });
    await prisma.school.deleteMany({
      where: {
        code: {
          in: [schoolA.code, schoolB.code],
        },
      },
    });
    await prisma.$disconnect();
    await app.close();
  });

  it('rejects protected endpoint without token', async () => {
    const server = app.getHttpServer() as Parameters<typeof request>[0];
    await request(server).get('/api/v1/auth/me').expect(401);
  });

  it('forbids school admin from reading another school', async () => {
    const server = app.getHttpServer() as Parameters<typeof request>[0];
    await request(server)
      .get(`/api/v1/schools/${schoolBId}`)
      .set('Authorization', `Bearer ${schoolAdminAToken}`)
      .expect(403);
  });

  it('forbids school admin from creating user for another school', async () => {
    const server = app.getHttpServer() as Parameters<typeof request>[0];
    await request(server)
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${schoolAdminAToken}`)
      .send({
        schoolId: schoolBId,
        username: `e2e_teacher_${suffix}`,
        password: 'E2eTeacher123',
        realName: 'E2E Teacher',
        role: 'TEACHER',
      })
      .expect(403);
  });

  it('allows system admin to read arbitrary school', async () => {
    const server = app.getHttpServer() as Parameters<typeof request>[0];
    await request(server)
      .get(`/api/v1/schools/${schoolBId}`)
      .set('Authorization', `Bearer ${systemAdminToken}`)
      .expect(200)
      .expect((res) => {
        const body = res.body as {
          code: number;
          data: { id: number };
        };
        expect(body.code).toBe(0);
        expect(body.data.id).toBe(schoolBId);
      });
  });
});

async function loginAndGetAccessToken(
  app: INestApplication,
  username: string,
  password: string,
): Promise<string> {
  const server = app.getHttpServer() as Parameters<typeof request>[0];
  const response = await request(server)
    .post('/api/v1/auth/login')
    .send({ username, password })
    .expect(201);

  const body = response.body as {
    data: { accessToken: string };
  };
  return body.data.accessToken;
}
