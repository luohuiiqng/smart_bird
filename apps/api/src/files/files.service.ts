import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, UserRole } from '@prisma/client';
import type { AuthenticatedUser } from '../common/types/auth-user';
import { PrismaService } from '../prisma/prisma.service';
import { UploadFileDto } from './dto/upload-file.dto';

@Injectable()
export class FilesService {
  constructor(private readonly prisma: PrismaService) {}

  async upload(currentUser: AuthenticatedUser, dto: UploadFileDto) {
    const schoolId = this.requireSchoolScope(currentUser);
    const objectKey = this.buildObjectKey(schoolId, dto);

    const file = await this.prisma.fileAsset.create({
      data: {
        schoolId,
        uploaderId: currentUser.id,
        category: dto.category,
        objectKey,
        fileName: dto.fileName,
        contentType: dto.contentType,
        size: dto.size,
        bizType: dto.bizType,
        bizId: dto.bizId,
      },
    });

    await this.writeAudit({
      schoolId,
      operatorId: currentUser.id,
      action: 'upload',
      targetId: file.id,
      content: `上传文件：${dto.fileName}`,
      metadata: {
        category: dto.category,
        size: dto.size,
        bizType: dto.bizType ?? null,
        bizId: dto.bizId ?? null,
      },
    });

    return {
      fileId: file.id,
      objectKey: file.objectKey,
      fileName: file.fileName,
      size: file.size,
      contentType: file.contentType,
    };
  }

  async detail(currentUser: AuthenticatedUser, fileId: number) {
    const file = await this.mustGetFile(currentUser, fileId);
    return file;
  }

  async presignedUrl(
    currentUser: AuthenticatedUser,
    fileId: number,
    expiresIn?: number | string,
  ) {
    const file = await this.mustGetFile(currentUser, fileId);
    const parsed =
      typeof expiresIn === 'string'
        ? Number.parseInt(expiresIn, 10)
        : expiresIn;
    const ttl = Number.isFinite(parsed) && (parsed ?? 0) > 0 ? parsed! : 300;
    return {
      url: `https://minio.local/${file.objectKey}?expiresIn=${ttl}&signature=dev-placeholder`,
      expiresIn: ttl,
    };
  }

  async remove(currentUser: AuthenticatedUser, fileId: number) {
    const file = await this.mustGetFile(currentUser, fileId);
    if (file.bizType === 'published-score') {
      throw new ConflictException('FILE_409');
    }

    const updated = await this.prisma.fileAsset.update({
      where: { id: fileId },
      data: { deletedAt: new Date() },
    });
    await this.writeAudit({
      schoolId: file.schoolId,
      operatorId: currentUser.id,
      action: 'delete',
      targetId: file.id,
      content: `删除文件：${file.fileName}`,
      metadata: { objectKey: file.objectKey },
    });
    return updated;
  }

  private async mustGetFile(currentUser: AuthenticatedUser, fileId: number) {
    const schoolId = this.requireSchoolScope(currentUser);
    const file = await this.prisma.fileAsset.findFirst({
      where: { id: fileId, deletedAt: null },
    });
    if (!file) {
      throw new NotFoundException('FILE_404');
    }
    if (file.schoolId !== schoolId) {
      throw new ForbiddenException('FILE_403');
    }
    return file;
  }

  private requireSchoolScope(currentUser: AuthenticatedUser) {
    if (
      (currentUser.role === UserRole.SCHOOL_ADMIN ||
        currentUser.role === UserRole.TEACHER) &&
      currentUser.schoolId
    ) {
      return currentUser.schoolId;
    }
    throw new ForbiddenException('FILE_403');
  }

  private buildObjectKey(schoolId: number, dto: UploadFileDto) {
    const today = new Date().toISOString().slice(0, 10).replaceAll('-', '');
    const name = dto.fileName.replaceAll(/\s+/g, '_');
    return `school-${schoolId}/${dto.bizType ?? 'other'}/${dto.bizId ?? 0}/${dto.category.toLowerCase()}/${today}/${Date.now()}-${name}`;
  }

  private async writeAudit(payload: {
    schoolId: number;
    operatorId: number;
    action: string;
    targetId: number;
    content: string;
    metadata?: Prisma.InputJsonValue;
  }) {
    await this.prisma.auditLog.create({
      data: {
        schoolId: payload.schoolId,
        operatorId: payload.operatorId,
        module: 'files',
        action: payload.action,
        targetType: 'file',
        targetId: payload.targetId,
        content: payload.content,
        metadata: payload.metadata,
      },
    });
  }
}
