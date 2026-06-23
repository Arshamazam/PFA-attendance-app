import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.enableCors();
  await app.listen(3000);
  Logger.log('Backend running on http://localhost:3000', 'Bootstrap');
}
bootstrap();
