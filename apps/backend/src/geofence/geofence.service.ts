import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateZoneDto } from './dto/create-zone.dto';
import { isPointInPolygon, getDistance } from 'geolib';

@Injectable()
export class GeofenceService {
  private readonly logger = new Logger(GeofenceService.name);

  constructor(private prisma: PrismaService) {}

  async findAll() {
    const zones = await this.prisma.geofenceZone.findMany({ orderBy: { createdAt: 'desc' } });
    const counts = await this.prisma.attendance.groupBy({
      by: ['geofenceZoneId'],
      _count: { id: true },
    });
    const countMap = Object.fromEntries(counts.map((c) => [c.geofenceZoneId, c._count.id]));
    return zones.map((z) => ({ ...z, totalCheckIns: countMap[z.id] ?? 0 }));
  }

  async findOne(id: string) {
    const zone = await this.prisma.geofenceZone.findUnique({ where: { id } });
    if (!zone) throw new NotFoundException(`GeofenceZone ${id} not found`);
    return zone;
  }

  async create(dto: CreateZoneDto) {
    const zone = await this.prisma.geofenceZone.create({
      data: {
        name: dto.name,
        centerLat: dto.centerLat,
        centerLng: dto.centerLng,
        radiusMeters: dto.radiusMeters ?? 100,
        boundaryType: dto.boundaryType ?? 'circle',
        boundaryPoints: dto.boundaryPoints ?? undefined,
        hotspots: dto.hotspots ?? undefined,
        enforcementLevel: dto.enforcementLevel ?? 'strict',
        bufferZone: dto.bufferZone ?? 30,
        gpsAccuracyThreshold: dto.gpsAccuracyThreshold ?? 50,
        gracePeriod: dto.gracePeriod ?? 5,
        active: true,
        updatedAt: new Date(),
      },
    });
    this.logger.log(`GeofenceZone created: ${zone.name} (${zone.boundaryType})`);
    return zone;
  }

  async update(id: string, dto: Partial<CreateZoneDto>) {
    const zone = await this.prisma.geofenceZone.findUnique({ where: { id } });
    if (!zone) throw new NotFoundException(`GeofenceZone ${id} not found`);
    const data: Record<string, unknown> = { updatedAt: new Date() };
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.centerLat !== undefined) data.centerLat = dto.centerLat;
    if (dto.centerLng !== undefined) data.centerLng = dto.centerLng;
    if (dto.radiusMeters !== undefined) data.radiusMeters = dto.radiusMeters;
    if (dto.boundaryType !== undefined) data.boundaryType = dto.boundaryType;
    if (dto.boundaryPoints !== undefined) data.boundaryPoints = dto.boundaryPoints;
    if (dto.hotspots !== undefined) data.hotspots = dto.hotspots;
    if (dto.enforcementLevel !== undefined) data.enforcementLevel = dto.enforcementLevel;
    if (dto.bufferZone !== undefined) data.bufferZone = dto.bufferZone;
    if (dto.gpsAccuracyThreshold !== undefined) data.gpsAccuracyThreshold = dto.gpsAccuracyThreshold;
    if (dto.gracePeriod !== undefined) data.gracePeriod = dto.gracePeriod;
    return this.prisma.geofenceZone.update({ where: { id }, data });
  }

  async remove(id: string) {
    const zone = await this.prisma.geofenceZone.findUnique({ where: { id } });
    if (!zone) throw new NotFoundException(`GeofenceZone ${id} not found`);
    await this.prisma.geofenceZone.delete({ where: { id } });
    this.logger.log(`GeofenceZone deleted: ${id}`);
    return { message: 'Zone deleted' };
  }

  async setActive(id: string, active: boolean) {
    const zone = await this.prisma.geofenceZone.findUnique({ where: { id } });
    if (!zone) throw new NotFoundException(`GeofenceZone ${id} not found`);
    return this.prisma.geofenceZone.update({ where: { id }, data: { active, updatedAt: new Date() } });
  }

  async getCheckIns(id: string) {
    return this.prisma.attendance.findMany({
      where: { geofenceZoneId: id },
      select: {
        id: true, checkInTime: true, checkInLat: true, checkInLng: true,
        employee: { select: { name: true } },
      },
      orderBy: { checkInTime: 'desc' },
      take: 500,
    });
  }

  // ── Core verification logic used by AttendanceService ──────────────────────
  verifyLocation(
    lat: number,
    lng: number,
    gpsAccuracy: number | null,
    zone: {
      centerLat: number; centerLng: number; radiusMeters: number;
      boundaryType: string; boundaryPoints: unknown;
      enforcementLevel: string; bufferZone: number; gpsAccuracyThreshold: number;
      hotspots: unknown;
    },
  ): { allowed: boolean; score: number; method: string; distanceMeters: number; message: string } {
    const buffer = zone.bufferZone ?? 30;
    const accuracyThreshold = zone.gpsAccuracyThreshold ?? 50;
    const enforcement = zone.enforcementLevel ?? 'strict';

    // GPS accuracy check
    const accuracyOk = gpsAccuracy === null || gpsAccuracy <= accuracyThreshold;

    // Distance from center (always calculated for reporting)
    const distanceMeters = getDistance(
      { latitude: lat, longitude: lng },
      { latitude: zone.centerLat, longitude: zone.centerLng },
    );

    // Boundary check
    let inBoundary = false;
    if (zone.boundaryType === 'polygon' && Array.isArray(zone.boundaryPoints) && (zone.boundaryPoints as unknown[]).length >= 3) {
      const points = (zone.boundaryPoints as { lat: number; lng: number }[]).map((p) => ({
        latitude: p.lat, longitude: p.lng,
      }));
      inBoundary = isPointInPolygon({ latitude: lat, longitude: lng }, points);

      // For polygons, also check if within buffer of any boundary point
      if (!inBoundary && buffer > 0) {
        inBoundary = (zone.boundaryPoints as { lat: number; lng: number }[]).some((p) => {
          const d = getDistance({ latitude: lat, longitude: lng }, { latitude: p.lat, longitude: p.lng });
          return d <= buffer;
        });
      }
    } else {
      // Circle boundary
      inBoundary = distanceMeters <= (zone.radiusMeters + buffer);
    }

    // Check hotspots — if within any hotspot radius, also allow
    if (!inBoundary && Array.isArray(zone.hotspots)) {
      for (const hs of zone.hotspots as { lat: number; lng: number; radius: number }[]) {
        const d = getDistance({ latitude: lat, longitude: lng }, { latitude: hs.lat, longitude: hs.lng });
        if (d <= hs.radius + buffer) { inBoundary = true; break; }
      }
    }

    // Score calculation
    let score = 0;
    if (inBoundary) score += 60;
    if (gpsAccuracy !== null && gpsAccuracy <= 10) score += 40;
    else if (gpsAccuracy !== null && gpsAccuracy <= 20) score += 30;
    else if (gpsAccuracy !== null && gpsAccuracy <= 50) score += 15;
    else score += 5; // unknown accuracy

    // Enforcement logic
    let allowed = false;
    let method = 'none';

    if (enforcement === 'lenient') {
      allowed = inBoundary;
      method = 'lenient';
    } else if (enforcement === 'moderate') {
      allowed = inBoundary; // accuracy doesn't block, just scores lower
      method = 'moderate';
    } else {
      // strict — require boundary + reasonable accuracy
      if (inBoundary && accuracyOk) {
        allowed = true; method = 'strict-gps';
      } else if (inBoundary && !accuracyOk) {
        // GPS inaccurate but in boundary — allow but log as medium risk
        allowed = true; method = 'strict-boundary-only';
        score = Math.min(score, 65);
      }
    }

    const message = allowed
      ? `Check-in allowed (score: ${score}/100, ${method})`
      : inBoundary
        ? `GPS accuracy too low (${gpsAccuracy?.toFixed(0)}m, threshold: ${accuracyThreshold}m)`
        : `Outside boundary (${distanceMeters.toFixed(0)}m from center, radius: ${zone.radiusMeters + buffer}m)`;

    return { allowed, score, method, distanceMeters, message };
  }
}
