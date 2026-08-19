import { Module } from '@nestjs/common';
import { EmployeesService } from './employees.service';
import { EmployeesController } from './employees.controller';
import { PrismaService } from 'src/prisma/prisma.service';
import { GeofenceSyncService } from 'src/geofence-sync/geofence-sync.service';

@Module({
  providers: [EmployeesService, PrismaService, GeofenceSyncService],
  controllers: [EmployeesController],
})
export class EmployeesModule {}
