import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  /** 就绪检查：依赖数据库可用（未迁移或未启动 Postgres 时会失败） */
  @Get('health')
  async health(): Promise<{ ok: true }> {
    await this.appService.checkDatabase();
    return { ok: true };
  }
}
