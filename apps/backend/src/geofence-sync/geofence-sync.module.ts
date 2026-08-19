import { Global, Module } from '@nestjs/common';
import { GeofenceSyncService } from './geofence-sync.service';
import { PrismaService } from 'src/prisma/prisma.service';

@Global()
@Module({
  providers: [GeofenceSyncService, PrismaService],
  exports: [GeofenceSyncService],
})
export class GeofenceSyncModule {}
