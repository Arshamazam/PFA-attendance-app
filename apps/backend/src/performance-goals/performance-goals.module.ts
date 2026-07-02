import { Module } from '@nestjs/common';
import { PerformanceGoalsController } from './performance-goals.controller';
import { PerformanceGoalsService } from './performance-goals.service';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  controllers: [PerformanceGoalsController],
  providers: [PerformanceGoalsService, PrismaService],
})
export class PerformanceGoalsModule {}
