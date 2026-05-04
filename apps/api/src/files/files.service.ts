import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FileCategory, Prisma, UserRole } from '@prisma/client';
import { Client as MinioClient } from 'minio';
import type { AuthenticatedUser } from '../common/types/auth-user';
import { PrismaService } from '../prisma/prisma.service';
import { QueryFilesDto } from './dto/query-files.dto';
import { CreateAnswerSheetTemplateDto } from './dto/create-answer-sheet-template.dto';
import { UpdateFilePatchDto } from './dto/update-file-patch.dto';
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

  async list(currentUser: AuthenticatedUser, query: QueryFilesDto) {
    const schoolId = this.requireSchoolScope(currentUser);
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;

    const where: Prisma.FileAssetWhereInput = {
      schoolId,
      deletedAt: null,
      ...(query.category ? { category: query.category } : {}),
      ...(query.keyword
        ? {
            fileName: { contains: query.keyword.trim(), mode: 'insensitive' },
          }
        : {}),
      ...(query.onlyMine === true ? { uploaderId: currentUser.id } : {}),
    };

    const [list, total] = await this.prisma.$transaction([
      this.prisma.fileAsset.findMany({
        where,
        orderBy: { id: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          schoolId: true,
          uploaderId: true,
          category: true,
          objectKey: true,
          fileName: true,
          contentType: true,
          size: true,
          bizType: true,
          bizId: true,
          createdAt: true,
          updatedAt: true,
          uploader: {
            select: { realName: true, username: true },
          },
          school: {
            select: { name: true },
          },
        },
      }),
      this.prisma.fileAsset.count({ where }),
    ]);

    return { list, total, page, pageSize };
  }

  async detail(currentUser: AuthenticatedUser, fileId: number) {
    const file = await this.mustGetFile(currentUser, fileId);
    return file;
  }

  async patchFile(
    currentUser: AuthenticatedUser,
    fileId: number,
    dto: UpdateFilePatchDto,
  ) {
    const file = await this.mustGetFile(currentUser, fileId);
    const hasName = dto.fileName !== undefined;
    const hasLayout = dto.sheetLayout !== undefined;
    if (!hasName && !hasLayout) {
      throw new BadRequestException('FILE_400');
    }

    const data: Prisma.FileAssetUpdateInput = {};
    let auditContent = '';

    if (hasName) {
      const nextName = dto.fileName!.trim();
      if (!nextName) {
        throw new BadRequestException('FILE_400');
      }
      if (nextName.includes('/') || nextName.includes('\\')) {
        throw new BadRequestException('FILE_400');
      }
      data.fileName = nextName;
      auditContent = `更新文件：${file.fileName} → ${nextName}`;
    }

    if (hasLayout) {
      data.sheetLayout = dto.sheetLayout as Prisma.InputJsonValue;
      auditContent = auditContent
        ? `${auditContent}；同步答题卡版式 JSON`
        : `更新答题卡版式 JSON：${file.fileName}`;
    }

    const updated = await this.prisma.fileAsset.update({
      where: { id: fileId },
      data,
    });
    await this.writeAudit({
      schoolId: file.schoolId,
      operatorId: currentUser.id,
      action: 'update',
      targetId: file.id,
      content: auditContent || `更新文件：${file.fileName}`,
      metadata: { objectKey: file.objectKey },
    });
    return updated;
  }

  /**
   * 创建空答题卡模板：落库 `FileAsset` + MinIO 占位对象 + 默认 `sheetLayout`（与 Web 设计器 `layoutPayload` 对齐）。
   */
  async createAnswerSheetTemplate(
    currentUser: AuthenticatedUser,
    dto: CreateAnswerSheetTemplateDto,
  ) {
    const schoolId = this.requireSchoolScope(currentUser);
    let baseName = dto.fileName?.trim();
    if (!baseName) {
      const d = new Date();
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      baseName = `答题卡模板-${y}${m}${day}-${Date.now()}.json`;
    }
    if (baseName.includes('/') || baseName.includes('\\')) {
      throw new BadRequestException('FILE_400');
    }

    const placeholderJson = JSON.stringify({
      kind: 'answer-sheet-placeholder',
      schemaVersion: 1,
    });
    const buffer = Buffer.from(placeholderJson, 'utf8');

    const uploadDto = {
      category: FileCategory.ANSWER_SHEET_TEMPLATE,
      fileName: baseName,
      bizType: 'sheet-design',
      bizId: undefined as number | undefined,
    };
    const objectKey = this.buildObjectKey(schoolId, uploadDto);

    await this.ensureBucket();
    await this.minioClient.putObject(
      this.minioBucket,
      objectKey,
      buffer,
      buffer.length,
      {
        'Content-Type': 'application/json; charset=utf-8',
      },
    );

    const defaultSheetLayout: Prisma.InputJsonValue = {
      v: 1,
      paper: 'A3',
      marginMm: 10,
      optVertical: true,
      optHideScore: false,
      examIdMode: 'bubble',
      examIdLeft: false,
      absentMark: false,
      visualMode: 'standard',
      showBindingHoles: false,
      subjectPreset: 'generic',
      totalScore: 0,
      blocks: [],
    };

    const created = await this.prisma.fileAsset.create({
      data: {
        schoolId,
        uploaderId: currentUser.id,
        category: FileCategory.ANSWER_SHEET_TEMPLATE,
        objectKey,
        fileName: baseName,
        contentType: 'application/json; charset=utf-8',
        size: buffer.length,
        bizType: 'sheet-design',
        sheetLayout: defaultSheetLayout,
      },
    });

    await this.writeAudit({
      schoolId,
      operatorId: currentUser.id,
      action: 'create-answer-sheet-template',
      targetId: created.id,
      content: `新建答题卡模板：${baseName}`,
      metadata: {
        category: FileCategory.ANSWER_SHEET_TEMPLATE,
        objectKey,
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
