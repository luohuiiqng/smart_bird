import { ConfigService } from '@nestjs/config';

const DEV_ACCESS_FALLBACK = 'dev_access_secret_change_me';
const DEV_REFRESH_FALLBACK = 'dev_refresh_secret_change_me';

export function getAccessSecret(configService: ConfigService): string {
  return (
    configService.get<string>('JWT_ACCESS_SECRET') ??
    configService.get<string>('JWT_SECRET') ??
    DEV_ACCESS_FALLBACK
  );
}

export function getRefreshSecret(configService: ConfigService): string {
  return (
    configService.get<string>('JWT_REFRESH_SECRET') ??
    configService.get<string>('JWT_SECRET') ??
    DEV_REFRESH_FALLBACK
  );
}
