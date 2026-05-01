import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  const globalPrefix = process.env.API_PREFIX ?? 'api/v1';
  app.setGlobalPrefix(globalPrefix);
  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port);
}

void bootstrap();
