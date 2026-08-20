import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import * as express from 'express';
import { AppModule } from './app.module';
import { RequestAbortFilter } from './common/filters/request-abort.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.enableCors();
  app.useGlobalFilters(new RequestAbortFilter());

  const uploadsDir = join(process.cwd(), 'uploads');
  if (!existsSync(uploadsDir)) mkdirSync(uploadsDir, { recursive: true });
  app.use('/uploads', express.static(uploadsDir));

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  Logger.log(`Backend running on port ${port}`, 'Bootstrap');
}
bootstrap();
