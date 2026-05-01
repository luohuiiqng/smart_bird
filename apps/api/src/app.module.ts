import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { join } from 'node:path';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { SchoolsModule } from './schools/schools.module';
import { OrgModule } from './org/org.module';
import { ExamsModule } from './exams/exams.module';
import { MarkingModule } from './marking/marking.module';
import { ScoresModule } from './scores/scores.module';
import { AnalysisModule } from './analysis/analysis.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        join(__dirname, '../../..', '.env'),
        join(__dirname, '..', '.env'),
      ],
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    SchoolsModule,
    OrgModule,
    ExamsModule,
    MarkingModule,
    ScoresModule,
    AnalysisModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
