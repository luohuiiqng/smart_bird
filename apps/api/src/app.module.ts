import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PrismaModule } from './database/prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { ClassesModule } from './modules/classes/classes.module';
import { QuestionsModule } from './modules/questions/questions.module';
import { PapersModule } from './modules/papers/papers.module';
import { ExamsModule } from './modules/exams/exams.module';
import { GradingModule } from './modules/grading/grading.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { AiModule } from './modules/ai/ai.module';
import { SystemModule } from './modules/system/system.module';
import { CacheModule } from './cache/cache.module';
import { QueueModule } from './queue/queue.module';
import { StorageModule } from './storage/storage.module';
import { WebsocketsModule } from './websockets/websockets.module';

@Module({
  imports: [
    // 配置模块
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      cache: true,
    }),

    // 核心基础设施
    PrismaModule,
    CacheModule,
    QueueModule,
    StorageModule,
    WebsocketsModule,

    // 业务模块
    AuthModule,
    UsersModule,
    ClassesModule,
    QuestionsModule,
    PapersModule,
    ExamsModule,
    GradingModule,
    AnalyticsModule,
    NotificationsModule,
    AiModule,
    SystemModule,
  ],
})
export class AppModule {}
