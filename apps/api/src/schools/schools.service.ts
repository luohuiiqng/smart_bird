import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthenticatedUser } from '../common/types/auth-user';
import { UpdateSchoolDto } from './dto/update-school.dto';

@Injectable()
export class SchoolsService {
  constructor(private readonly prisma: PrismaService) {}

  async getById(currentUser: AuthenticatedUser, id: number) {
    this.ensureTenantAccess(currentUser, id);

    const school = await this.prisma.school.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        code: true,
        status: true,
        createdAt: true,
      },
    });

    if (!school) {
      throw new NotFoundException('SCHOOL_404');
    }

    return school;
  }

  async updateById(
    currentUser: AuthenticatedUser,
    id: number,
    dto: UpdateSchoolDto,
  ) {
    this.ensureTenantAccess(currentUser, id);

    const exists = await this.prisma.school.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!exists) {
      throw new NotFoundException('SCHOOL_404');
    }

    return this.prisma.school.update({
      where: { id },
      data: {
        name: dto.name,
        status: dto.status,
      },
      select: {
        id: true,
        name: true,
        code: true,
        status: true,
        createdAt: true,
      },
    });
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

    throw new ForbiddenException('AUTH_403');
  }
}
