import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { EntityStatus, PrismaClient, UserRole } from '@prisma/client';
import * as argon2 from 'argon2';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Org tenant isolation (e2e)', () => {
  let app: INestApplication;
  const prisma = new PrismaClient();

  const suffix = Date.now().toString();
  const schoolA = { code: `ORG_A_${suffix}`, name: `ORG School A ${suffix}` };
  const schoolB = { code: `ORG_B_${suffix}`, name: `ORG School B ${suffix}` };

  const schoolAdminA = {
    username: `org_admin_a_${suffix}`,
    password: 'OrgAdminA123',
  };
  const schoolAdminB = {
    username: `org_admin_b_${suffix}`,
    password: 'OrgAdminB123',
  };

  let schoolAId = 0;
  let schoolBId = 0;
  let gradeAId = 0;
  let classAId = 0;
  let tokenA = '';
  let tokenB = '';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix(process.env.API_PREFIX ?? 'api/v1');
    await app.init();

    const createdA = await prisma.school.create({
      data: {
        code: schoolA.code,
        name: schoolA.name,
        status: EntityStatus.ENABLED,
      },
      select: { id: true },
    });
    const createdB = await prisma.school.create({
      data: {
        code: schoolB.code,
        name: schoolB.name,
        status: EntityStatus.ENABLED,
      },
      select: { id: true },
    });
    schoolAId = createdA.id;
    schoolBId = createdB.id;

    const gradeA = await prisma.grade.create({
      data: {
        schoolId: schoolAId,
        name: `高一-${suffix}`,
        status: EntityStatus.ENABLED,
      },
      select: { id: true },
    });
    gradeAId = gradeA.id;

    const classA = await prisma.class.create({
      data: {
        schoolId: schoolAId,
        gradeId: gradeAId,
        name: `1班-${suffix}`,
        status: EntityStatus.ENABLED,
      },
      select: { id: true },
    });
    classAId = classA.id;

    await prisma.user.createMany({
      data: [
        {
          username: schoolAdminA.username,
          passwordHash: await argon2.hash(schoolAdminA.password),
          realName: 'Org Admin A',
          role: UserRole.SCHOOL_ADMIN,
          schoolId: schoolAId,
          status: EntityStatus.ENABLED,
        },
        {
          username: schoolAdminB.username,
          passwordHash: await argon2.hash(schoolAdminB.password),
          realName: 'Org Admin B',
          role: UserRole.SCHOOL_ADMIN,
          schoolId: schoolBId,
          status: EntityStatus.ENABLED,
        },
      ],
    });

    tokenA = await login(app, schoolAdminA.username, schoolAdminA.password);
    tokenB = await login(app, schoolAdminB.username, schoolAdminB.password);
  });

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: {
        username: { in: [schoolAdminA.username, schoolAdminB.username] },
      },
    });
    await prisma.student.deleteMany({
      where: { studentNo: { startsWith: `S-${suffix}` } },
    });
    await prisma.teacher.deleteMany({
      where: { name: { startsWith: `Teacher-${suffix}` } },
    });
    await prisma.class.deleteMany({ where: { id: classAId } });
    await prisma.grade.deleteMany({ where: { id: gradeAId } });
    await prisma.school.deleteMany({
      where: { code: { in: [schoolA.code, schoolB.code] } },
    });
    await prisma.$disconnect();
    await app.close();
  });

  it('school admin can create teacher in own school', async () => {
    const server = app.getHttpServer() as Parameters<typeof request>[0];
    await request(server)
      .post('/api/v1/org/teachers')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ name: `Teacher-${suffix}`, phone: `188${suffix.slice(-8)}` })
      .expect(201)
      .expect((res) => {
        const body = res.body as { code: number };
        expect(body.code).toBe(0);
      });
  });

  it('school admin can create student in own school', async () => {
    const server = app.getHttpServer() as Parameters<typeof request>[0];
    await request(server)
      .post('/api/v1/org/students')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        studentNo: `S-${suffix}-01`,
        name: `Student-${suffix}`,
        gradeId: gradeAId,
        classId: classAId,
      })
      .expect(201)
      .expect((res) => {
        const body = res.body as { code: number };
        expect(body.code).toBe(0);
      });
  });

  it('cross-school admin cannot access grade/class outside own school', async () => {
    const server = app.getHttpServer() as Parameters<typeof request>[0];
    await request(server)
      .post('/api/v1/org/students')
      .set('Authorization', `Bearer ${tokenB}`)
      .send({
        studentNo: `S-${suffix}-02`,
        name: `Student-B-${suffix}`,
        gradeId: gradeAId,
        classId: classAId,
      })
      .expect(404);
  });

  it('list endpoints are tenant isolated', async () => {
    const server = app.getHttpServer() as Parameters<typeof request>[0];
    const teachersA = await request(server)
      .get('/api/v1/org/teachers')
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);

    const teachersB = await request(server)
      .get('/api/v1/org/teachers')
      .set('Authorization', `Bearer ${tokenB}`)
      .expect(200);

    const bodyA = teachersA.body as { data: { total: number } };
    const bodyB = teachersB.body as { data: { total: number } };
    expect(bodyA.data.total).toBeGreaterThanOrEqual(1);
    expect(bodyB.data.total).toBe(0);
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
