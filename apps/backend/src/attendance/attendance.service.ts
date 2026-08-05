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

  // PKT = UTC+5
  private pktNow(): Date {
    return new Date(Date.now() + 5 * 60 * 60 * 1000);
  }

  // Returns the shift-end time in UTC for a given record.
  // Morning ends at 17:00 PKT = 12:00 UTC; Evening ends at 01:00 PKT next-day = 20:00 UTC same UTC-day.
  private shiftEndUtc(checkInUtc: Date, shift: string | null): Date | null {
    if (!shift) return null;
    const pktCheckIn = new Date(checkInUtc.getTime() + 5 * 60 * 60 * 1000);
    const pktDate = new Date(pktCheckIn);
    if (shift === 'morning') {
      // 17:00 PKT on the same PKT calendar day
      pktDate.setHours(17, 0, 0, 0);
    } else {
      // 01:00 PKT the following calendar day
      pktDate.setDate(pktDate.getDate() + 1);
      pktDate.setHours(1, 0, 0, 0);
    }
    // Convert back to UTC
    return new Date(pktDate.getTime() - 5 * 60 * 60 * 1000);
  }

  // Derive attendance status from shift and check-in time.
  // Morning: on_time before 09:30 PKT, late after. Evening: on_time before 17:30 PKT, late after.
  private resolveStatus(checkInUtc: Date, shift: string | null, lateReason?: string): string {
    if (!shift) return lateReason ? 'late' : 'on_time';
    const pkt = new Date(checkInUtc.getTime() + 5 * 60 * 60 * 1000);
    const h = pkt.getHours();
    const m = pkt.getMinutes();
    const totalMinutes = h * 60 + m;
    if (shift === 'morning') {
      return totalMinutes <= 9 * 60 + 30 ? 'on_time' : 'late';
    } else {
      return totalMinutes <= 17 * 60 + 30 ? 'on_time' : 'late';
    }
  }

  async checkIn(employeeId: string, dto: CheckInDto) {
    // A verified selfie photo is mandatory — reject API calls that skip the upload step
    if (!dto.photoUrl) {
      throw new BadRequestException('A selfie photo is required to check in.');
    }

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

    // Auto-close any expired open check-in before allowing a new one.
    // Use 'asc' so we always act on the oldest open record first.
    const openRecord = await this.prisma.attendance.findFirst({
      where: { employeeId, checkOutTime: null },
      orderBy: { checkInTime: 'asc' },
    });

    if (openRecord) {
      const shiftEnd = this.shiftEndUtc(openRecord.checkInTime, openRecord.shift);
      const nowUtc = new Date();
      // Guard: shiftEnd must be strictly after checkInTime to avoid recording
      // a checkout time that is earlier than the check-in (data integrity).
      const canAutoClose =
        shiftEnd !== null &&
        nowUtc > shiftEnd &&
        shiftEnd > openRecord.checkInTime;

      if (canAutoClose) {
        await this.prisma.attendance.update({
          where: { id: openRecord.id },
          data: { checkOutTime: shiftEnd, status: 'auto_checkout', updatedAt: nowUtc },
        });
        this.logger.log(`Auto checked-out record ${openRecord.id} for employee ${employeeId} at shift end`);
      } else {
        throw new BadRequestException('Already checked in. Please check out first.');
      }
    }

    const now = new Date();
    const status = this.resolveStatus(now, dto.shift ?? null, dto.lateReason);

    const attendance = await this.prisma.attendance.create({
      data: {
        employeeId,
        checkInTime: now,
        checkInLat: dto.lat,
        checkInLng: dto.lng,
        checkInPhotoUrl: dto.photoUrl,
        lateReason: dto.lateReason,
        lateReasonNotes: dto.lateReasonNotes,
        shift: dto.shift,
        geofenceZoneId: resolvedZoneId,
        status,
        updatedAt: now,
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

    // Enforce 3-hour minimum between check-in and check-out
    const elapsedMs = Date.now() - attendance.checkInTime.getTime();
    const elapsedMinutes = elapsedMs / 60_000;
    if (elapsedMinutes < 180) {
      const remaining = Math.ceil(180 - elapsedMinutes);
      const h = Math.floor(remaining / 60);
      const m = remaining % 60;
      const label = h > 0 ? `${h}h ${m}m` : `${m}m`;
      throw new BadRequestException(`You can only check out at least 3 hours after check-in. Please wait ${label}.`);
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

  async getStatistics(date?: string, zoneId?: string, department?: string) {
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

    // If department filter active, restrict attendance to employees in that department
    if (department) {
      const deptEmps = await this.prisma.employee.findMany({
        where: { deletedAt: null, department },
        select: { id: true },
      });
      attWhere.employeeId = { in: deptEmps.map((e) => e.id) };
    }

    let totalEmployees: number;
    if (zoneId && department) {
      const rows = await this.prisma.$queryRaw<[{ cnt: bigint }]>`
        SELECT COUNT(*) AS cnt FROM Employee
        WHERE deletedAt IS NULL AND active = 1
        AND JSON_CONTAINS(geofenceZoneIds, JSON_QUOTE(${zoneId}))
        AND department = ${department}
      `;
      totalEmployees = Number(rows[0].cnt);
    } else if (zoneId) {
      const rows = await this.prisma.$queryRaw<[{ cnt: bigint }]>`
        SELECT COUNT(*) AS cnt FROM Employee
        WHERE deletedAt IS NULL AND active = 1
        AND JSON_CONTAINS(geofenceZoneIds, JSON_QUOTE(${zoneId}))
      `;
      totalEmployees = Number(rows[0].cnt);
    } else {
      const empFilter: Record<string, unknown> = { deletedAt: null, active: true };
      if (department) empFilter.department = department;
      totalEmployees = await this.prisma.employee.count({ where: empFilter });
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
      return h < 9 || (h === 9 && m <= 30);
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
      if (h < 9 || (h === 9 && m <= 30)) byDept[dept].onTime++;
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

  async getTrend(days = 30, zoneId?: string, department?: string) {
    const PKT_OFFSET_MS = 5 * 60 * 60 * 1000;
    // End = end of today in PKT
    const nowPkt = new Date(Date.now() + PKT_OFFSET_MS);
    const todayStr = nowPkt.toISOString().split('T')[0];
    const [ty, tm, td] = todayStr.split('-').map(Number);
    const end = new Date(Date.UTC(ty, tm - 1, td + 1, 0, 0, 0, 0) - PKT_OFFSET_MS); // tomorrow PKT midnight in UTC
    const start = new Date(end.getTime() - days * 86_400_000);

    const attWhere: Record<string, unknown> = { checkInTime: { gte: start, lt: end } };
    if (zoneId) attWhere.geofenceZoneId = zoneId;
    if (department) {
      const deptEmps = await this.prisma.employee.findMany({
        where: { deletedAt: null, department },
        select: { id: true },
      });
      attWhere.employeeId = { in: deptEmps.map((e) => e.id) };
    }

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
