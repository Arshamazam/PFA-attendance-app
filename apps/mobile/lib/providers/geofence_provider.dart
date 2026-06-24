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

  GeofenceZone? matchingZone(double lat, double lon) {
    for (final zone in _zones) {
      final distance = Geolocator.distanceBetween(
        lat, lon, zone.latitude, zone.longitude,
      );
      if (distance <= zone.radiusMeters) return zone;
    }
    return null;
  }

  bool isWithinAnyZone(double lat, double lon) => matchingZone(lat, lon) != null;
}
