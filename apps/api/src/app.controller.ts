import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Controller()
export class AppController {
  constructor(private readonly configService: ConfigService) {}

  @Get()
  root() {
    return {
      success: true,
      data: {
        name: this.configService.get('APP_NAME', '智能阅卷系统'),
        version: this.configService.get('APP_VERSION', '1.0.0'),
        status: 'running',
        timestamp: new Date().toISOString(),
      },
    };
  }
}
