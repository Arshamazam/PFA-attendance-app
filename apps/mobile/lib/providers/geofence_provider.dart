import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import '../models/geofence_zone.dart';
import '../services/api_service.dart';

class GeofenceProvider extends ChangeNotifier {
  final ApiService _api;

  List<GeofenceZone> _zones = [];
  bool _isLoading = false;
  String? _errorMessage;

  GeofenceProvider(this._api);

  List<GeofenceZone> get zones => List.unmodifiable(_zones);
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;

  Future<void> fetchGeofences() async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();
    try {
      _zones = await _api.fetchGeofences();
    } on ApiException catch (e) {
      _errorMessage = e.message;
    } catch (_) {
      _errorMessage = 'Failed to load geofence data.';
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  // Ray-casting point-in-polygon
  bool _isPointInPolygon(
      double lat, double lng, List<Map<String, double>> polygon) {
    bool inside = false;
    final int n = polygon.length;
    int j = n - 1;
    for (int i = 0; i < n; i++) {
      final double xi = polygon[i]['lat']!;
      final double yi = polygon[i]['lng']!;
      final double xj = polygon[j]['lat']!;
      final double yj = polygon[j]['lng']!;
      if (((yi > lng) != (yj > lng)) &&
          (lat < (xj - xi) * (lng - yi) / (yj - yi) + xi)) {
        inside = !inside;
      }
      j = i;
    }
    return inside;
  }

  GeofenceZone? matchingZone(double lat, double lon,
      {List<String>? allowedZoneIds}) {
    for (final zone in _zones) {
      if (allowedZoneIds != null && !allowedZoneIds.contains(zone.id)) {
        continue;
      }
      if (!zone.isActive) continue;

      bool inZone = false;
      final double buffer = zone.bufferZone.toDouble();

      if (zone.boundaryType == 'polygon' && zone.boundaryPoints.length >= 3) {
        // Polygon check
        inZone = _isPointInPolygon(lat, lon, zone.boundaryPoints);

        // Buffer: check if within bufferZone distance of any polygon vertex
        if (!inZone && buffer > 0) {
          for (final p in zone.boundaryPoints) {
            final double d = Geolocator.distanceBetween(
                lat, lon, p['lat']!, p['lng']!);
            if (d <= buffer) {
              inZone = true;
              break;
            }
          }
        }
      } else {
        // Circle check
        final double distance = Geolocator.distanceBetween(
            lat, lon, zone.latitude, zone.longitude);
        inZone = distance <= (zone.radiusMeters + buffer);
      }

      // Check hotspots
      if (!inZone) {
        for (final hs in zone.hotspots) {
          final double hsLat = (hs['lat'] as num).toDouble();
          final double hsLng = (hs['lng'] as num).toDouble();
          final double hsRadius = (hs['radius'] as num).toDouble();
          final double d =
              Geolocator.distanceBetween(lat, lon, hsLat, hsLng);
          if (d <= hsRadius + buffer) {
            inZone = true;
            break;
          }
        }
      }

      if (inZone) return zone;
    }
    return null;
  }

  bool isWithinAnyZone(double lat, double lon,
          {List<String>? allowedZoneIds}) =>
      matchingZone(lat, lon, allowedZoneIds: allowedZoneIds) != null;
}

