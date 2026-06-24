import 'package:flutter/material.dart';
import '../models/leave_request.dart';
import '../services/api_service.dart';

class LeaveProvider extends ChangeNotifier {
  final ApiService _api;

  List<LeaveRequest> _requests = [];
  bool _isLoading = false;
  bool _hasMore = true;
  int _currentPage = 1;
  String? _errorMessage;

  LeaveProvider(this._api);

  List<LeaveRequest> get requests => List.unmodifiable(_requests);
  bool get isLoading => _isLoading;
  bool get hasMore => _hasMore;
  String? get errorMessage => _errorMessage;

  Future<void> fetchRequests({bool refresh = false}) async {
    if (_isLoading) return;
    if (refresh) {
      _currentPage = 1;
      _requests = [];
      _hasMore = true;
    }
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final response = await _api.getLeaveRequests(page: _currentPage, limit: 10);
      final newItems = (response['data'] as List? ?? [])
          .whereType<Map<String, dynamic>>()
          .map(LeaveRequest.fromJson)
          .toList();
      if (refresh) {
        _requests = newItems;
      } else {
        _requests = [..._requests, ...newItems];
      }
      final total = response['total'] as int? ?? 0;
      _hasMore = _requests.length < total;
    } on ApiException catch (e) {
      _errorMessage = e.message;
    } catch (_) {
      _errorMessage = 'Failed to load leave requests.';
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> loadMore() async {
    if (!_hasMore || _isLoading) return;
    _currentPage++;
    await fetchRequests();
  }

  Future<void> submitRequest({
    required String startDate,
    required String endDate,
    required String leaveType,
    required String reason,
  }) async {
    await _api.submitLeaveRequest(
      startDate: startDate,
      endDate: endDate,
      leaveType: leaveType,
      reason: reason,
    );
    await fetchRequests(refresh: true);
  }
}
