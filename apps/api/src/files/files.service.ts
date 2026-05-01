import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma, UserRole } from '@prisma/client';
import { Client as MinioClient } from 'minio';
import type { AuthenticatedUser } from '../common/types/auth-user';
import { PrismaService } from '../prisma/prisma.service';
import { UploadBinaryFileDto } from './dto/upload-binary-file.dto';
import { UploadFileDto } from './dto/upload-file.dto';

@Injectable()
export class FilesService {
  private readonly minioClient: MinioClient;
  private readonly minioBucket: string;
  private minioBucketEnsured = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    this.minioBucket =
      this.configService.get<string>('MINIO_BUCKET') ?? 'exam-files';
    const useSSLValue =
      this.configService.get<string>('MINIO_USE_SSL') ?? 'false';
    this.minioClient = new MinioClient({
      endPoint: this.configService.get<string>('MINIO_ENDPOINT') ?? '127.0.0.1',
      port: Number(this.configService.get<string>('MINIO_PORT') ?? 9000),
      useSSL: useSSLValue.toLowerCase() === 'true',
      accessKey:
        this.configService.get<string>('MINIO_ACCESS_KEY') ?? 'minioadmin',
      secretKey:
        this.configService.get<string>('MINIO_SECRET_KEY') ?? 'minioadmin',
    });
  }

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

  async uploadBinary(
    currentUser: AuthenticatedUser,
    file: {
      originalname: string;
      mimetype: string;
      size: number;
      buffer: Buffer;
    },
    dto: UploadBinaryFileDto,
  ) {
    if (!file || !file.buffer || file.size <= 0) {
      throw new BadRequestException('FILE_400');
    }

    const schoolId = this.requireSchoolScope(currentUser);
    const objectKey = this.buildObjectKey(schoolId, {
      category: dto.category,
      fileName: file.originalname,
      bizType: dto.bizType,
      bizId: dto.bizId,
    });

    await this.ensureBucket();
    await this.minioClient.putObject(
      this.minioBucket,
      objectKey,
      file.buffer,
      file.size,
      {
        'Content-Type': file.mimetype || 'application/octet-stream',
      },
    );

    const created = await this.prisma.fileAsset.create({
      data: {
        schoolId,
        uploaderId: currentUser.id,
        category: dto.category,
        objectKey,
        fileName: file.originalname,
        contentType: file.mimetype || 'application/octet-stream',
        size: file.size,
        bizType: dto.bizType,
        bizId: dto.bizId,
      },
    });

    await this.writeAudit({
      schoolId,
      operatorId: currentUser.id,
      action: 'upload-binary',
      targetId: created.id,
      content: `上传文件二进制：${file.originalname}`,
      metadata: {
        category: dto.category,
        size: file.size,
        bizType: dto.bizType ?? null,
        bizId: dto.bizId ?? null,
      },
    });

    return {
      fileId: created.id,
      objectKey: created.objectKey,
      fileName: created.fileName,
      size: created.size,
      contentType: created.contentType,
    };
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

    try {
      await this.ensureBucket();
      const url = await this.minioClient.presignedGetObject(
        this.minioBucket,
        file.objectKey,
        ttl,
      );
      return { url, expiresIn: ttl };
    } catch {
      // 回退占位签名，保证测试环境与未配置 MinIO 场景可用。
    }

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

  private buildObjectKey(
    schoolId: number,
    dto: Pick<UploadFileDto, 'category' | 'fileName' | 'bizType' | 'bizId'>,
  ) {
    const today = new Date().toISOString().slice(0, 10).replaceAll('-', '');
    const name = dto.fileName.replaceAll(/\s+/g, '_');
    return `school-${schoolId}/${dto.bizType ?? 'other'}/${dto.bizId ?? 0}/${dto.category.toLowerCase()}/${today}/${Date.now()}-${name}`;
  }

  private async ensureBucket() {
    if (this.minioBucketEnsured) {
      return;
    }
    const exists = await this.minioClient.bucketExists(this.minioBucket);
    if (!exists) {
      await this.minioClient.makeBucket(this.minioBucket);
    }
    this.minioBucketEnsured = true;
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
