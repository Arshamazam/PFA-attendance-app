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

      // Derive today's check-in status from records
      final today = DateTime.now();
      AttendanceRecord? todayRecord;
      for (final r in _records) {
        if (r.date.year == today.year &&
            r.date.month == today.month &&
            r.date.day == today.day) {
          todayRecord = r;
          break;
        }
      }

      if (todayRecord != null) {
        _isCheckedIn =
            todayRecord.checkInTime != null && todayRecord.checkOutTime == null;
        _todayRecordId = _isCheckedIn ? todayRecord.id : null;
      } else {
        _isCheckedIn = false;
        _todayRecordId = null;
      }

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
    required String geofenceZoneId,
    String? lateReason,
    String? lateReasonNotes,
    String? photoPath,
  }) async {
    final result = await _api.checkIn(
      latitude: latitude,
      longitude: longitude,
      geofenceZoneId: geofenceZoneId,
      lateReason: lateReason,
      lateReasonNotes: lateReasonNotes,
      photoPath: photoPath,
    );
    _isCheckedIn = true;
    _todayRecordId = result['id'] as String?;
    notifyListeners();
    await fetchDashboard();
  }

  Future<void> checkOut() async {
    if (_todayRecordId == null) {
      throw const ApiException('No active check-in found. Please refresh.');
    }
    await _api.checkOut(attendanceId: _todayRecordId!);
    _isCheckedIn = false;
    _todayRecordId = null;
    notifyListeners();
    await fetchDashboard();
  }
}
