import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EntityStatus, Prisma, UserRole } from '@prisma/client';
import * as argon2 from 'argon2';
import { PrismaService } from '../prisma/prisma.service';
import { AuthenticatedUser } from '../common/types/auth-user';
import { CreateUserDto } from './dto/create-user.dto';
import { QueryUsersDto } from './dto/query-users.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async list(currentUser: AuthenticatedUser, query: QueryUsersDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;

    const where: Prisma.UserWhereInput = {
      ...(query.keyword
        ? {
            OR: [
              { username: { contains: query.keyword, mode: 'insensitive' } },
              { realName: { contains: query.keyword, mode: 'insensitive' } },
            ],
          }
        : {}),
      ...(query.role ? { role: query.role } : {}),
      ...(query.status ? { status: query.status } : {}),
    };

    if (currentUser.role === UserRole.SCHOOL_ADMIN) {
      where.schoolId = currentUser.schoolId;
    }

    const [list, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        orderBy: { id: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          schoolId: true,
          username: true,
          realName: true,
          role: true,
          status: true,
          createdAt: true,
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return { list, total, page, pageSize };
  }

  async create(currentUser: AuthenticatedUser, dto: CreateUserDto) {
    const schoolId = this.resolveCreateSchoolId(currentUser, dto);

    try {
      const created = await this.prisma.user.create({
        data: {
          schoolId,
          username: dto.username,
          passwordHash: await argon2.hash(dto.password),
          realName: dto.realName,
          phone: dto.phone,
          role: dto.role,
          status: dto.status ?? EntityStatus.ENABLED,
        },
        select: {
          id: true,
          schoolId: true,
          username: true,
          realName: true,
          role: true,
          status: true,
          createdAt: true,
        },
      });

      return created;
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('USER_409');
      }
      throw error;
    }
  }

  async update(
    currentUser: AuthenticatedUser,
    userId: number,
    dto: UpdateUserDto,
  ) {
    const target = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, schoolId: true },
    });

    if (!target) {
      throw new NotFoundException('USER_404');
    }

    this.ensureTenantAccess(currentUser, target.schoolId);

    return this.prisma.user.update({
      where: { id: userId },
      data: {
        realName: dto.realName,
        phone: dto.phone,
        role: dto.role,
        status: dto.status,
      },
      select: {
        id: true,
        schoolId: true,
        username: true,
        realName: true,
        role: true,
        status: true,
        createdAt: true,
      },
    });
  }

  async resetPassword(
    currentUser: AuthenticatedUser,
    userId: number,
    dto: ResetPasswordDto,
  ) {
    const target = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, schoolId: true },
    });

    if (!target) {
      throw new NotFoundException('USER_404');
    }

    this.ensureTenantAccess(currentUser, target.schoolId);

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash: await argon2.hash(dto.newPassword),
        refreshTokenHash: null,
      },
    });

    return true;
  }

  private ensureTenantAccess(
    currentUser: AuthenticatedUser,
    targetSchoolId: number | null,
  ) {
    if (currentUser.role !== UserRole.SCHOOL_ADMIN) {
      return;
    }

    if (currentUser.schoolId !== targetSchoolId) {
      throw new ForbiddenException('AUTH_403');
    }
  }

  private resolveCreateSchoolId(
    currentUser: AuthenticatedUser,
    dto: CreateUserDto,
  ): number | null {
    if (currentUser.role === UserRole.SYSTEM_ADMIN) {
      return dto.schoolId ?? null;
    }

    if (currentUser.role === UserRole.SCHOOL_ADMIN) {
      if (!currentUser.schoolId) {
        throw new ForbiddenException('AUTH_403');
      }

      if (dto.schoolId && dto.schoolId !== currentUser.schoolId) {
        throw new ForbiddenException('AUTH_403');
      }

      return currentUser.schoolId;
    }

    throw new ForbiddenException('AUTH_403');
  }
}
