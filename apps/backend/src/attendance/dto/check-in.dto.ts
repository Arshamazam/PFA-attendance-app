export class CheckInDto {
  lat: number;
  lng: number;
  geofenceZoneId?: string;
  photoUrl?: string;
  lateReason?: string;
  lateReasonNotes?: string;
  gpsAccuracy?: number;
  shift?: string;
}
