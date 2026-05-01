import { PrismaClient, UserRole, EntityStatus } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  const schoolCode = process.env.SEED_SCHOOL_CODE ?? 'DEMO_SCHOOL_001';
  const schoolName = process.env.SEED_SCHOOL_NAME ?? '示例学校';

  const systemAdminUsername = process.env.SEED_SYSTEM_ADMIN_USERNAME ?? 'sysadmin';
  const systemAdminPassword =
    process.env.SEED_SYSTEM_ADMIN_PASSWORD ?? 'Sysadmin123';

  const schoolAdminUsername = process.env.SEED_SCHOOL_ADMIN_USERNAME ?? 'schooladmin';
  const schoolAdminPassword =
    process.env.SEED_SCHOOL_ADMIN_PASSWORD ?? 'Schooladmin123';

  const school = await prisma.school.upsert({
    where: { code: schoolCode },
    update: { name: schoolName, status: EntityStatus.ENABLED },
    create: {
      code: schoolCode,
      name: schoolName,
      status: EntityStatus.ENABLED,
    },
  });

  await prisma.user.upsert({
    where: { username: systemAdminUsername },
    update: {
      realName: '系统管理员',
      role: UserRole.SYSTEM_ADMIN,
      status: EntityStatus.ENABLED,
      schoolId: null,
      passwordHash: await argon2.hash(systemAdminPassword),
      refreshTokenHash: null,
    },
    create: {
      username: systemAdminUsername,
      realName: '系统管理员',
      role: UserRole.SYSTEM_ADMIN,
      status: EntityStatus.ENABLED,
      schoolId: null,
      passwordHash: await argon2.hash(systemAdminPassword),
    },
  });

  await prisma.user.upsert({
    where: { username: schoolAdminUsername },
    update: {
      realName: '学校管理员',
      role: UserRole.SCHOOL_ADMIN,
      status: EntityStatus.ENABLED,
      schoolId: school.id,
      passwordHash: await argon2.hash(schoolAdminPassword),
      refreshTokenHash: null,
    },
    create: {
      username: schoolAdminUsername,
      realName: '学校管理员',
      role: UserRole.SCHOOL_ADMIN,
      status: EntityStatus.ENABLED,
      schoolId: school.id,
      passwordHash: await argon2.hash(schoolAdminPassword),
    },
  });

  console.log('Seed completed');
  console.log(
    JSON.stringify(
      {
        school: { id: school.id, code: school.code, name: school.name },
        systemAdmin: { username: systemAdminUsername },
        schoolAdmin: { username: schoolAdminUsername },
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
