import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { EntityStatus } from '@prisma/client';
import * as argon2 from 'argon2';
import { PrismaService } from '../prisma/prisma.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { JwtPayload } from '../common/types/auth-user';
import type { StringValue } from 'ms';
import { getAccessSecret, getRefreshSecret } from './auth-config';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { username: dto.username },
      select: {
        id: true,
        schoolId: true,
        username: true,
        passwordHash: true,
        realName: true,
        role: true,
        status: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('AUTH_401');
    }

    const passwordOk = await argon2.verify(user.passwordHash, dto.password);
    if (!passwordOk) {
      throw new UnauthorizedException('AUTH_401');
    }

    if (user.status !== EntityStatus.ENABLED) {
      throw new ForbiddenException('AUTH_403');
    }

    const payload: JwtPayload = {
      sub: user.id,
      schoolId: user.schoolId,
      role: user.role,
      username: user.username,
    };

    const tokens = await this.issueTokens(payload);
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        refreshTokenHash: await argon2.hash(tokens.refreshToken),
        lastLoginAt: new Date(),
      },
    });

    return {
      ...tokens,
      user: {
        id: user.id,
        schoolId: user.schoolId,
        username: user.username,
        realName: user.realName,
        role: user.role,
      },
    };
  }

  async refresh(dto: RefreshTokenDto) {
    const payload = await this.verifyRefreshToken(dto.refreshToken);

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        schoolId: true,
        username: true,
        role: true,
        status: true,
        refreshTokenHash: true,
      },
    });

    if (!user || !user.refreshTokenHash) {
      throw new UnauthorizedException('AUTH_401');
    }

    if (user.status !== EntityStatus.ENABLED) {
      throw new ForbiddenException('AUTH_403');
    }

    const tokenOk = await argon2.verify(
      user.refreshTokenHash,
      dto.refreshToken,
    );
    if (!tokenOk) {
      throw new UnauthorizedException('AUTH_401');
    }

    const tokens = await this.issueTokens({
      sub: user.id,
      schoolId: user.schoolId,
      role: user.role,
      username: user.username,
    });

    await this.prisma.user.update({
      where: { id: user.id },
      data: { refreshTokenHash: await argon2.hash(tokens.refreshToken) },
    });

    return tokens;
  }

  async logout(userId: number) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshTokenHash: null },
    });

    return true;
  }

  async changePassword(userId: number, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, passwordHash: true },
    });
    if (!user) {
      throw new UnauthorizedException('AUTH_401');
    }
    const okPwd = await argon2.verify(user.passwordHash, dto.currentPassword);
    if (!okPwd) {
      throw new UnauthorizedException('AUTH_401');
    }
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash: await argon2.hash(dto.newPassword),
        refreshTokenHash: null,
      },
    });
    return true;
  }

  async me(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        school: { select: { name: true } },
      },
    });

    if (!user) {
      throw new UnauthorizedException('AUTH_401');
    }

    return {
      id: user.id,
      schoolId: user.schoolId,
      username: user.username,
      realName: user.realName,
      role: user.role,
      status: user.status,
      schoolName: user.school?.name ?? null,
    };
  }

  private async issueTokens(payload: JwtPayload) {
    const accessExpiresIn = (this.configService.get<string>(
      'JWT_ACCESS_EXPIRES_IN',
    ) ?? '2h') as StringValue;
    const refreshExpiresIn = (this.configService.get<string>(
      'JWT_REFRESH_EXPIRES_IN',
    ) ?? '7d') as StringValue;

    const accessToken = await this.jwtService.signAsync(payload, {
      secret: getAccessSecret(this.configService),
      expiresIn: accessExpiresIn,
    });

    const refreshToken = await this.jwtService.signAsync(payload, {
      secret: getRefreshSecret(this.configService),
      expiresIn: refreshExpiresIn,
    });

    const expiresIn = this.parseExpiresInToSeconds(
      this.configService.get<string>('JWT_ACCESS_EXPIRES_IN') ?? '2h',
    );

    return { accessToken, refreshToken, expiresIn };
  }

  private async verifyRefreshToken(token: string): Promise<JwtPayload> {
    try {
      return await this.jwtService.verifyAsync<JwtPayload>(token, {
        secret: getRefreshSecret(this.configService),
      });
    } catch {
      throw new UnauthorizedException('AUTH_401');
    }
  }

  private parseExpiresInToSeconds(expiresIn: string): number {
    const value = expiresIn.trim();
    const match = value.match(/^(\d+)([smhd])$/);

    if (!match) {
      const asNumber = Number(value);
      return Number.isFinite(asNumber) ? asNumber : 7200;
    }

    const amount = Number(match[1]);
    const unit = match[2];

    switch (unit) {
      case 's':
        return amount;
      case 'm':
        return amount * 60;
      case 'h':
        return amount * 3600;
      case 'd':
        return amount * 86400;
      default:
        return 7200;
    }
  }
}
