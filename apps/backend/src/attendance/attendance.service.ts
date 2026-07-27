import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { GeofenceService } from 'src/geofence/geofence.service';
import { CheckInDto } from './dto/check-in.dto';
import { CheckOutDto } from './dto/check-out.dto';

@Injectable()
export class AttendanceService {
  private readonly logger = new Logger(AttendanceService.name);

  constructor(
    private prisma: PrismaService,
    private geofenceService: GeofenceService,
  ) {}

  async checkIn(employeeId: string, dto: CheckInDto) {
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      select: { geofenceZoneIds: true, requiresGeofence: true },
    });
    if (!employee) throw new NotFoundException('Employee not found');

    let resolvedZoneId: string | null = null;

    if (employee.requiresGeofence) {
      if (!dto.geofenceZoneId) {
        throw new BadRequestException('Geofence zone ID is required');
      }
      const zone = await this.prisma.geofenceZone.findFirst({
        where: { id: dto.geofenceZoneId, active: true },
      });
      if (!zone) throw new NotFoundException('Geofence zone not found or inactive');
      if (!(employee.geofenceZoneIds as string[]).includes(zone.id)) {
        throw new BadRequestException('This geofence zone is not assigned to your profile');
      }

      const result = this.geofenceService.verifyLocation(
        dto.lat, dto.lng, dto.gpsAccuracy ?? null, zone as any,
      );

      if (!result.allowed) {
        throw new BadRequestException(result.message);
      }

      resolvedZoneId = zone.id;
      this.logger.log(`Check-in verified: ${result.method} score=${result.score} dist=${result.distanceMeters.toFixed(0)}m`);
    } else {
      this.logger.log(`Employee ${employeeId} checked in (geofence exempted) from ${dto.lat},${dto.lng}`);
    }

    const existing = await this.prisma.attendance.findFirst({
      where: { employeeId, checkOutTime: null },
    });
    if (existing) throw new BadRequestException('Already checked in. Please check out first.');

    const attendance = await this.prisma.attendance.create({
      data: {
        employeeId,
        checkInTime: new Date(),
        checkInLat: dto.lat,
        checkInLng: dto.lng,
        checkInPhotoUrl: dto.photoUrl,
        lateReason: dto.lateReason,
        lateReasonNotes: dto.lateReasonNotes,
        geofenceZoneId: resolvedZoneId,
        status: 'pending',
        updatedAt: new Date(),
      },
      include: { geofenceZone: true },
    });

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
      data: { checkOutTime: new Date(), checkOutPhotoUrl: dto.checkOutPhotoUrl, updatedAt: new Date() },
      include: { geofenceZone: true },
    });

    this.logger.log(`Employee ${employeeId} checked out`);
    return updated;
  }

  async getAllRecords(
    page = 1,
    limit = 20,
    employeeId?: string,
    startDate?: string,
    endDate?: string,
  ) {
    const skip = (page - 1) * limit;
    const where: Record<string, unknown> = {};
    if (employeeId) where.employeeId = employeeId;
    if (startDate || endDate) {
      where.checkInTime = {
        ...(startDate ? { gte: new Date(startDate) } : {}),
        ...(endDate ? { lte: new Date(endDate + 'T23:59:59.999Z') } : {}),
      };
    }
    const [records, total] = await Promise.all([
      this.prisma.attendance.findMany({
        where,
        include: {
          employee: { select: { id: true, name: true, email: true } },
          geofenceZone: { select: { id: true, name: true } },
        },
        skip,
        take: limit,
        orderBy: { checkInTime: 'desc' },
      }),
      this.prisma.attendance.count({ where }),
    ]);
    return { data: records, total, page, limit };
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

  async getStatistics(date?: string, zoneId?: string) {
    // PKT is UTC+5; interpret date param in PKT so "today" boundaries match local working hours
    const PKT_OFFSET_MS = 5 * 60 * 60 * 1000;
    const dateStr =
      date ?? new Date(Date.now() + PKT_OFFSET_MS).toISOString().split('T')[0];
    const [y, mo, d] = dateStr.split('-').map(Number);
    // PKT midnight → UTC: subtract 5h
    const start = new Date(Date.UTC(y, mo - 1, d, 0, 0, 0, 0) - PKT_OFFSET_MS);
    const end = new Date(start.getTime() + 86_400_000);

    const attWhere: Record<string, unknown> = { checkInTime: { gte: start, lt: end } };
    if (zoneId) attWhere.geofenceZoneId = zoneId;

    let totalEmployees: number;
    if (zoneId) {
      // Count employees whose geofenceZoneIds JSON array contains this zone
      const rows = await this.prisma.$queryRaw<[{ cnt: bigint }]>`
        SELECT COUNT(*) AS cnt FROM Employee
        WHERE deletedAt IS NULL AND active = 1
        AND JSON_CONTAINS(geofenceZoneIds, JSON_QUOTE(${zoneId}))
      `;
      totalEmployees = Number(rows[0].cnt);
    } else {
      totalEmployees = await this.prisma.employee.count({ where: { deletedAt: null, active: true } });
    }

    const records = await this.prisma.attendance.findMany({
      where: attWhere,
      include: { employee: { select: { name: true, department: true } } },
    });

    // Interpret check-in hour in PKT
    const pktHour = (dt: Date) => {
      const pkt = new Date(dt.getTime() + PKT_OFFSET_MS);
      return { h: pkt.getUTCHours(), m: pkt.getUTCMinutes() };
    };

    const onTime = records.filter((r) => {
      const { h, m } = pktHour(r.checkInTime);
      return h < 9 || (h === 9 && m === 0);
    }).length;

    const avgMins =
      records.length > 0
        ? Math.round(
            records.reduce((sum, r) => {
              const { h, m } = pktHour(r.checkInTime);
              return sum + h * 60 + m;
            }, 0) / records.length,
          )
        : 0;

    const byDept: Record<string, { onTime: number; late: number }> = {};
    for (const r of records) {
      const dept = r.employee?.department ?? 'Unknown';
      if (!byDept[dept]) byDept[dept] = { onTime: 0, late: 0 };
      const { h, m } = pktHour(r.checkInTime);
      if (h < 9 || (h === 9 && m === 0)) byDept[dept].onTime++;
      else byDept[dept].late++;
    }

    return {
      date: dateStr,
      totalCheckIns: records.length,
      onTime,
      late: records.length - onTime,
      absent: Math.max(0, totalEmployees - records.length),
      totalEmployees,
      avgCheckInTime: `${String(Math.floor(avgMins / 60)).padStart(2, '0')}:${String(avgMins % 60).padStart(2, '0')}`,
      byDepartment: Object.entries(byDept).map(([dept, counts]) => ({ dept, ...counts })),
    };
  }

  async getTrend(days = 30, zoneId?: string) {
    const PKT_OFFSET_MS = 5 * 60 * 60 * 1000;
    // End = end of today in PKT
    const nowPkt = new Date(Date.now() + PKT_OFFSET_MS);
    const todayStr = nowPkt.toISOString().split('T')[0];
    const [ty, tm, td] = todayStr.split('-').map(Number);
    const end = new Date(Date.UTC(ty, tm - 1, td + 1, 0, 0, 0, 0) - PKT_OFFSET_MS); // tomorrow PKT midnight in UTC
    const start = new Date(end.getTime() - days * 86_400_000);

    const attWhere: Record<string, unknown> = { checkInTime: { gte: start, lt: end } };
    if (zoneId) attWhere.geofenceZoneId = zoneId;

    const records = await this.prisma.attendance.findMany({
      where: attWhere,
      select: { checkInTime: true },
    });

    const byDay: Record<string, { date: string; total: number; onTime: number; late: number }> = {};
    // Build day buckets in PKT
    for (let i = 0; i < days; i++) {
      const bucketStart = new Date(start.getTime() + i * 86_400_000);
      const key = new Date(bucketStart.getTime() + PKT_OFFSET_MS).toISOString().split('T')[0];
      byDay[key] = { date: key, total: 0, onTime: 0, late: 0 };
    }
    for (const r of records) {
      // Map record to PKT day
      const pkt = new Date(r.checkInTime.getTime() + PKT_OFFSET_MS);
      const key = pkt.toISOString().split('T')[0];
      if (!byDay[key]) continue;
      byDay[key].total++;
      const h = pkt.getUTCHours();
      const m = pkt.getUTCMinutes();
      if (h < 9 || (h === 9 && m === 0)) byDay[key].onTime++;
      else byDay[key].late++;
    }
    return Object.values(byDay);
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
