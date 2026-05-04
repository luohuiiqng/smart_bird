"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const argon2 = __importStar(require("argon2"));
const prisma = new client_1.PrismaClient();
async function main() {
    const schoolCode = process.env.SEED_SCHOOL_CODE ?? 'DEMO_SCHOOL_001';
    const schoolName = process.env.SEED_SCHOOL_NAME ?? '示例学校';
    const systemAdminUsername = process.env.SEED_SYSTEM_ADMIN_USERNAME ?? 'sysadmin';
    const systemAdminPassword = process.env.SEED_SYSTEM_ADMIN_PASSWORD ?? 'Sysadmin123';
    const schoolAdminUsername = process.env.SEED_SCHOOL_ADMIN_USERNAME ?? 'THZDXX01';
    const schoolAdminPassword = process.env.SEED_SCHOOL_ADMIN_PASSWORD ?? '666888';
    const school = await prisma.school.upsert({
        where: { code: schoolCode },
        update: { name: schoolName, status: client_1.EntityStatus.ENABLED },
        create: {
            code: schoolCode,
            name: schoolName,
            status: client_1.EntityStatus.ENABLED,
        },
    });
    await prisma.user.upsert({
        where: { username: systemAdminUsername },
        update: {
            realName: '系统管理员',
            role: client_1.UserRole.SYSTEM_ADMIN,
            status: client_1.EntityStatus.ENABLED,
            schoolId: null,
            passwordHash: await argon2.hash(systemAdminPassword),
            refreshTokenHash: null,
        },
        create: {
            username: systemAdminUsername,
            realName: '系统管理员',
            role: client_1.UserRole.SYSTEM_ADMIN,
            status: client_1.EntityStatus.ENABLED,
            schoolId: null,
            passwordHash: await argon2.hash(systemAdminPassword),
        },
    });
    await prisma.user.upsert({
        where: { username: schoolAdminUsername },
        update: {
            realName: '学校管理员',
            role: client_1.UserRole.SCHOOL_ADMIN,
            status: client_1.EntityStatus.ENABLED,
            schoolId: school.id,
            passwordHash: await argon2.hash(schoolAdminPassword),
            refreshTokenHash: null,
        },
        create: {
            username: schoolAdminUsername,
            realName: '学校管理员',
            role: client_1.UserRole.SCHOOL_ADMIN,
            status: client_1.EntityStatus.ENABLED,
            schoolId: school.id,
            passwordHash: await argon2.hash(schoolAdminPassword),
        },
    });
    console.log('Seed completed');
    console.log(JSON.stringify({
        school: { id: school.id, code: school.code, name: school.name },
        systemAdmin: { username: systemAdminUsername },
        schoolAdmin: { username: schoolAdminUsername },
    }, null, 2));
}
main()
    .catch((error) => {
    console.error(error);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=seed.js.map