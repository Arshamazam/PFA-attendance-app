import { Module } from '@nestjs/common';
import { EmployeeCategoriesController } from './employee-categories.controller';
import { EmployeeCategoriesService } from './employee-categories.service';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  controllers: [EmployeeCategoriesController],
  providers:   [EmployeeCategoriesService, PrismaService],
  exports:     [EmployeeCategoriesService],
})
export class EmployeeCategoriesModule {}
