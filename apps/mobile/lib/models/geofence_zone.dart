class GeofenceZone {
  final String id;
  final String name;
  final double latitude;
  final double longitude;
  final double radiusMeters;
  final bool isActive;
  final String boundaryType;
  final List<Map<String, double>> boundaryPoints;
  final List<Map<String, dynamic>> hotspots;
  final String enforcementLevel;
  final int bufferZone;
  final int gpsAccuracyThreshold;

  const GeofenceZone({
    required this.id,
    required this.name,
    required this.latitude,
    required this.longitude,
    required this.radiusMeters,
    this.isActive = true,
    this.boundaryType = 'circle',
    this.boundaryPoints = const [],
    this.hotspots = const [],
    this.enforcementLevel = 'strict',
    this.bufferZone = 30,
    this.gpsAccuracyThreshold = 50,
  });

  factory GeofenceZone.fromJson(Map<String, dynamic> json) => GeofenceZone(
        id: json['id'] as String? ?? '',
        name: json['name'] as String? ?? 'Office',
        latitude: (json['centerLat'] as num?)?.toDouble() ??
            (json['lat'] as num?)?.toDouble() ??
            0.0,
        longitude: (json['centerLng'] as num?)?.toDouble() ??
            (json['lng'] as num?)?.toDouble() ??
            0.0,
        radiusMeters: (json['radiusMeters'] as num?)?.toDouble() ?? 100.0,
        isActive: json['active'] as bool? ?? true,
        boundaryType: json['boundaryType'] as String? ?? 'circle',
        boundaryPoints: (json['boundaryPoints'] as List<dynamic>?)
                ?.map((p) => {
                      'lat': (p['lat'] as num).toDouble(),
                      'lng': (p['lng'] as num).toDouble(),
                    })
                .toList() ??
            [],
        hotspots: (json['hotspots'] as List<dynamic>?)
                ?.map((h) => Map<String, dynamic>.from(h as Map))
                .toList() ??
            [],
        enforcementLevel: json['enforcementLevel'] as String? ?? 'strict',
        bufferZone: (json['bufferZone'] as num?)?.toInt() ?? 30,
        gpsAccuracyThreshold:
            (json['gpsAccuracyThreshold'] as num?)?.toInt() ?? 50,
      );
}
