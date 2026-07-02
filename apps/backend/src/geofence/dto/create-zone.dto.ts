export class CreateZoneDto {
  name: string;
  centerLat: number;
  centerLng: number;
  radiusMeters: number;
  boundaryType?: string;
  boundaryPoints?: { lat: number; lng: number }[];
  hotspots?: { name: string; lat: number; lng: number; radius: number }[];
  enforcementLevel?: string;
  bufferZone?: number;
  gpsAccuracyThreshold?: number;
  gracePeriod?: number;
}
