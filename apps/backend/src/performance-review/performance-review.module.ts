import { Module } from '@nestjs/common';
import { PerformanceReviewController } from './performance-review.controller';
import { PerformanceReviewService } from './performance-review.service';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  controllers: [PerformanceReviewController],
  providers:   [PerformanceReviewService, PrismaService],
})
export class PerformanceReviewModule {}
