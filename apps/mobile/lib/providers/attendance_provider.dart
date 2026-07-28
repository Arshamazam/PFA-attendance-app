import 'package:flutter/material.dart';
import '../models/attendance_record.dart';
import '../models/leave_balance.dart';
import '../services/api_service.dart';

class AttendanceProvider extends ChangeNotifier {
  final ApiService _api;

  bool _isCheckedIn = false;
  String? _todayRecordId;
  List<AttendanceRecord> _records = [];
  LeaveSummary _leaveSummary = LeaveSummary.defaultSummary;
  bool _isLoading = false;
  bool _hasMore = true;
  int _currentPage = 1;
  String? _errorMessage;

  AttendanceProvider(this._api);

  ApiService get api => _api;

  bool get isCheckedIn => _isCheckedIn;
  String? get todayRecordId => _todayRecordId;
  List<AttendanceRecord> get records => List.unmodifiable(_records);
  LeaveSummary get leaveSummary => _leaveSummary;
  bool get isLoading => _isLoading;
  bool get hasMore => _hasMore;
  String? get errorMessage => _errorMessage;

  Future<void> fetchDashboard() async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      _currentPage = 1;
      final fetched = await _api.getAttendanceHistory(page: 1, limit: 20);
      _records = fetched;
      _hasMore = fetched.length >= 20;

      // Derive check-in status: find the most recent open check-in (no checkout yet).
      // Records are sorted desc by checkInTime so the first open one is the latest.
      AttendanceRecord? openRecord;
      for (final r in _records) {
        if (r.checkInTime != null && r.checkOutTime == null) {
          openRecord = r;
          break;
        }
      }
      _isCheckedIn = openRecord != null;
      _todayRecordId = openRecord?.id;

      // Try leave summary — non-critical
      try {
        _leaveSummary = await _api.getLeaveSummary();
      } catch (_) {}
    } on ApiException catch (e) {
      _errorMessage = e.message;
    } catch (_) {
      _errorMessage = 'Failed to load data.';
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> loadMoreRecords() async {
    if (!_hasMore || _isLoading) return;
    _isLoading = true;
    notifyListeners();
    try {
      _currentPage++;
      final fetched = await _api.getAttendanceHistory(page: _currentPage);
      _records = [..._records, ...fetched];
      _hasMore = fetched.length >= 10;
    } catch (_) {
      _currentPage--;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> checkIn({
    required double latitude,
    required double longitude,
    double? gpsAccuracy,
    String? geofenceZoneId,
    String? lateReason,
    String? lateReasonNotes,
    String? photoPath,
    String? shift,
  }) async {
    final result = await _api.checkIn(
      latitude: latitude,
      longitude: longitude,
      gpsAccuracy: gpsAccuracy,
      geofenceZoneId: geofenceZoneId,
      lateReason: lateReason,
      lateReasonNotes: lateReasonNotes,
      photoPath: photoPath,
      shift: shift,
    );
    _isCheckedIn = true;
    _todayRecordId = result['id'] as String?;
    notifyListeners();
    await fetchDashboard();
  }

  Future<void> checkOut({String? photoPath}) async {
    if (_todayRecordId == null) {
      throw const ApiException('No active check-in found. Please refresh.');
    }
    await _api.checkOut(attendanceId: _todayRecordId!, photoPath: photoPath);
    _isCheckedIn = false;
    _todayRecordId = null;
    notifyListeners();
    await fetchDashboard();
  }
}
