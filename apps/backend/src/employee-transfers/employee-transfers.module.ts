import { Module } from '@nestjs/common';
import { EmployeeTransfersController } from './employee-transfers.controller';
import { EmployeeTransfersService } from './employee-transfers.service';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  controllers: [EmployeeTransfersController],
  providers: [EmployeeTransfersService, PrismaService],
})
export class EmployeeTransfersModule {}
