class GeofenceZone {
  final String id;
  final String name;
  final double latitude;
  final double longitude;
  final double radiusMeters;
  final bool isActive;

  const GeofenceZone({
    required this.id,
    required this.name,
    required this.latitude,
    required this.longitude,
    required this.radiusMeters,
    this.isActive = true,
  });

  factory GeofenceZone.fromJson(Map<String, dynamic> json) => GeofenceZone(
        id: json['id'] as String? ?? '',
        name: json['name'] as String? ?? 'Office',
        latitude: (json['latitude'] as num?)?.toDouble() ??
            (json['centerLat'] as num?)?.toDouble() ??
            (json['lat'] as num?)?.toDouble() ??
            0.0,
        longitude: (json['longitude'] as num?)?.toDouble() ??
            (json['centerLng'] as num?)?.toDouble() ??
            (json['lng'] as num?)?.toDouble() ??
            (json['lon'] as num?)?.toDouble() ??
            0.0,
        radiusMeters: (json['radiusMeters'] as num?)?.toDouble() ??
            (json['radius'] as num?)?.toDouble() ??
            100.0,
        isActive: json['active'] as bool? ?? json['isActive'] as bool? ?? true,
      );
}
