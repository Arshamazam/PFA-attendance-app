import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateZoneDto } from './dto/create-zone.dto';

@Injectable()
export class GeofenceService {
  private readonly logger = new Logger(GeofenceService.name);

  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.geofenceZone.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async findOne(id: string) {
    const zone = await this.prisma.geofenceZone.findUnique({ where: { id } });
    if (!zone) throw new NotFoundException(`GeofenceZone ${id} not found`);
    return zone;
  }

  async create(dto: CreateZoneDto) {
    const zone = await this.prisma.geofenceZone.create({
      data: { ...dto, active: true, updatedAt: new Date() },
    });
    this.logger.log(`GeofenceZone created: ${zone.name}`);
    return zone;
  }

  async setActive(id: string, active: boolean) {
    const zone = await this.prisma.geofenceZone.findUnique({ where: { id } });
    if (!zone) throw new NotFoundException(`GeofenceZone ${id} not found`);
    return this.prisma.geofenceZone.update({
      where: { id },
      data: { active, updatedAt: new Date() },
    });
  }
}
