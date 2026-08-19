import { Module } from '@nestjs/common';
import { EmployeeTransfersController } from './employee-transfers.controller';
import { EmployeeTransfersService } from './employee-transfers.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { GeofenceSyncService } from 'src/geofence-sync/geofence-sync.service';

@Module({
  controllers: [EmployeeTransfersController],
  providers: [EmployeeTransfersService, PrismaService, GeofenceSyncService],
})
export class EmployeeTransfersModule {}
