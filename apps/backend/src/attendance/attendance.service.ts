import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CheckInDto } from './dto/check-in.dto';
import { CheckOutDto } from './dto/check-out.dto';

@Injectable()
export class AttendanceService {
  private readonly logger = new Logger(AttendanceService.name);

  constructor(private prisma: PrismaService) {}

  private async isWithinGeofence(
    lat: number,
    lng: number,
    centerLat: number,
    centerLng: number,
    radiusMeters: number,
  ): Promise<boolean> {
    // Use PostGIS ST_DWithin with geography type for accurate meter-based distance
    const result = await this.prisma.$queryRaw<[{ within: boolean }]>`
      SELECT ST_DWithin(
        ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography,
        ST_SetSRID(ST_MakePoint(${centerLng}, ${centerLat}), 4326)::geography,
        ${radiusMeters}
      ) AS within
    `;
    return result[0].within;
  }

  async checkIn(employeeId: string, dto: CheckInDto) {
    const zone = await this.prisma.geofenceZone.findFirst({
      where: { id: dto.geofenceZoneId, active: true },
    });

    if (!zone) {
      throw new NotFoundException('Geofence zone not found or inactive');
    }

    const within = await this.isWithinGeofence(
      dto.lat,
      dto.lng,
      zone.centerLat,
      zone.centerLng,
      zone.radiusMeters,
    );

    if (!within) {
      throw new BadRequestException(
        `Location is outside the geofence zone (radius: ${zone.radiusMeters}m)`,
      );
    }

    const existing = await this.prisma.attendance.findFirst({
      where: { employeeId, checkOutTime: null },
    });

    if (existing) {
      throw new BadRequestException('Already checked in. Please check out first.');
    }

    const attendance = await this.prisma.attendance.create({
      data: {
        employeeId,
        checkInTime: new Date(),
        checkInLat: dto.lat,
        checkInLng: dto.lng,
        checkInPhotoUrl: dto.photoUrl,
        geofenceZoneId: zone.id,
        status: 'pending',
        updatedAt: new Date(),
      },
      include: { geofenceZone: true },
    });

    this.logger.log(`Employee ${employeeId} checked in at zone ${zone.name}`);
    return attendance;
  }

  async checkOut(employeeId: string, dto: CheckOutDto) {
    const attendance = await this.prisma.attendance.findFirst({
      where: { id: dto.attendanceId, employeeId, checkOutTime: null },
    });

    if (!attendance) {
      throw new NotFoundException('Active attendance record not found');
    }

    const updated = await this.prisma.attendance.update({
      where: { id: attendance.id },
      data: { checkOutTime: new Date(), updatedAt: new Date() },
      include: { geofenceZone: true },
    });

    this.logger.log(`Employee ${employeeId} checked out`);
    return updated;
  }

  async getMyRecords(employeeId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [records, total] = await Promise.all([
      this.prisma.attendance.findMany({
        where: { employeeId },
        include: { geofenceZone: { select: { id: true, name: true } } },
        skip,
        take: limit,
        orderBy: { checkInTime: 'desc' },
      }),
      this.prisma.attendance.count({ where: { employeeId } }),
    ]);

    return { data: records, total, page, limit };
  }

  async getEmployeeRecords(
    targetId: string,
    requesterId: string,
    requesterRole: string,
    page = 1,
    limit = 20,
  ) {
    if (requesterId !== targetId && !['admin', 'manager'].includes(requesterRole)) {
      throw new ForbiddenException('Insufficient permissions');
    }

    const skip = (page - 1) * limit;
    const [records, total] = await Promise.all([
      this.prisma.attendance.findMany({
        where: { employeeId: targetId },
        include: {
          employee: { select: { id: true, name: true, email: true } },
          geofenceZone: { select: { id: true, name: true } },
        },
        skip,
        take: limit,
        orderBy: { checkInTime: 'desc' },
      }),
      this.prisma.attendance.count({ where: { employeeId: targetId } }),
    ]);

    return { data: records, total, page, limit };
  }
}
