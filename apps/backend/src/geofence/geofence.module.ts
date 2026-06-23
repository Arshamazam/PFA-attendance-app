import { Module } from '@nestjs/common';
import { GeofenceService } from './geofence.service';
import { GeofenceController } from './geofence.controller';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  providers: [GeofenceService, PrismaService],
  controllers: [GeofenceController],
})
export class GeofenceModule {}
