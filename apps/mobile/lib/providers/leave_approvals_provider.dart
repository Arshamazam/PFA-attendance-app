import 'package:flutter/material.dart';
import '../models/leave_request.dart';
import '../services/api_service.dart';

class LeaveApprovalsProvider extends ChangeNotifier {
  final ApiService _api;

  List<LeaveRequest> _pending = [];
  List<LeaveRequest> _approved = [];
  List<LeaveRequest> _rejected = [];
  bool _isLoading = false;
  String? _errorMessage;

  LeaveApprovalsProvider(this._api);

  List<LeaveRequest> get pending => List.unmodifiable(_pending);
  List<LeaveRequest> get approved => List.unmodifiable(_approved);
  List<LeaveRequest> get rejected => List.unmodifiable(_rejected);
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;

  Future<void> fetchAll() async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final results = await Future.wait([
        _api.getPendingApprovals(),
        _api.getMyApprovals(status: 'approved'),
        _api.getMyApprovals(status: 'rejected'),
      ]);
      _pending = _parseList(results[0]);
      _approved = _parseList(results[1]);
      _rejected = _parseList(results[2]);
    } on ApiException catch (e) {
      _errorMessage = e.message;
    } catch (_) {
      _errorMessage = 'Failed to load approvals.';
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  List<LeaveRequest> _parseList(Map<String, dynamic> res) {
    return (res['data'] as List? ?? [])
        .whereType<Map<String, dynamic>>()
        .map(LeaveRequest.fromJson)
        .toList();
  }

  Future<void> approve(String leaveId) async {
    await _api.approveLeave(leaveId);
    await fetchAll();
  }

  Future<void> reject(String leaveId, String reason) async {
    await _api.rejectLeave(leaveId, reason);
    await fetchAll();
  }
}
