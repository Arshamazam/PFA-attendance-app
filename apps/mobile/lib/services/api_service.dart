import 'dart:io';
import 'package:device_info_plus/device_info_plus.dart';
import 'package:dio/dio.dart';
import '../models/user.dart';
import '../models/attendance_record.dart';
import '../models/geofence_zone.dart';
import '../models/leave_balance.dart';
import '../models/dropdown_option.dart';

class ApiException implements Exception {
  final String message;
  final int? statusCode;
  const ApiException(this.message, {this.statusCode});
  @override
  String toString() => message;
}

class UnauthorizedException extends ApiException {
  const UnauthorizedException() : super('Session expired. Please log in again.', statusCode: 401);
}

class ApiService {
  static String _baseUrl = 'https://srv1809828.hstgr.cloud/api';
  static String get baseUrl => _baseUrl;

  // Call once in main() before runApp — detects iOS Simulator vs real device
  static Future<void> initialize() async {
    if (Platform.isIOS) {
      final info = await DeviceInfoPlugin().iosInfo;
      if (!info.isPhysicalDevice) {
        _baseUrl = 'http://localhost:3000';
      }
    }
  }

  late final Dio _dio;

  ApiService() {
    _dio = Dio(
      BaseOptions(
        baseUrl: _baseUrl,
        connectTimeout: const Duration(seconds: 40),
        receiveTimeout: const Duration(seconds: 60),
        headers: {'Content-Type': 'application/json'},
      ),
    );
  }

  void setToken(String? token) {
    if (token != null) {
      _dio.options.headers['Authorization'] = 'Bearer $token';
    } else {
      _dio.options.headers.remove('Authorization');
    }
  }

  T _handleResponse<T>(Response response, T Function(dynamic data) parser) {
    if (response.statusCode == 401) throw const UnauthorizedException();
    return parser(response.data);
  }

  Future<T> _request<T>(Future<Response> Function() call, T Function(dynamic) parser) async {
    try {
      final response = await call();
      return _handleResponse(response, parser);
    } on DioException catch (e) {
      final status = e.response?.statusCode;
      if (status == 401) throw const UnauthorizedException();
      // 3xx redirect on a POST means the server is momentarily restarting
      if (status != null && status >= 300 && status < 400) {
        throw const ApiException('Server is temporarily unavailable. Please try again in a moment.', statusCode: 503);
      }
      final msg = (e.response?.data is Map)
          ? (e.response!.data as Map)['message']?.toString() ?? e.message ?? 'Request failed'
          : e.message ?? 'Cannot connect to server';
      throw ApiException(msg, statusCode: status);
    }
  }

  Future<Map<String, dynamic>> login(String email, String password) => _request(
        () => _dio.post('/auth/login', data: {'email': email, 'password': password}),
        (data) => data as Map<String, dynamic>,
      );

  Future<User> getProfile() => _request(
        () => _dio.get('/auth/me'),
        (data) => User.fromJson(data as Map<String, dynamic>),
      );

  Future<String> uploadAttendancePhoto(String filePath) => _request(
        () async {
          final formData = FormData.fromMap({
            'photo': await MultipartFile.fromFile(
              filePath,
              filename: File(filePath).uri.pathSegments.last,
            ),
          });
          return _dio.post('/attendance/upload-photo', data: formData);
        },
        (data) => (data as Map<String, dynamic>)['url'] as String,
      );

  Future<List<GeofenceZone>> fetchGeofences() => _request(
        () => _dio.get('/geofence'),
        (data) {
          final list = data is List ? data : (data['data'] as List? ?? []);
          return list
              .whereType<Map<String, dynamic>>()
              .map(GeofenceZone.fromJson)
              .where((z) => z.isActive)
              .toList();
        },
      );

  Future<Map<String, dynamic>> getDashboard() => _request(
        () => _dio.get('/attendance/dashboard'),
        (data) => data as Map<String, dynamic>? ?? {},
      );

  Future<LeaveSummary> getLeaveSummary() => _request(
        () => _dio.get('/leaves/summary'),
        (data) {
          if (data is Map<String, dynamic>) return LeaveSummary.fromJson(data);
          return LeaveSummary.defaultSummary;
        },
      );

  Future<List<AttendanceRecord>> getAttendanceHistory({int page = 1, int limit = 10}) =>
      _request(
        () => _dio.get('/attendance/my-records', queryParameters: {'page': page, 'limit': limit}),
        (data) {
          final list = data is List ? data : (data['data'] as List? ?? []);
          return list
              .whereType<Map<String, dynamic>>()
              .map(AttendanceRecord.fromJson)
              .toList();
        },
      );

  Future<Map<String, dynamic>> getGeofenceStatus(String employeeId) => _request(
    () => _dio.get('/employees/$employeeId/geofence-status'),
    (data) => data as Map<String, dynamic>? ?? {'requiresGeofence': true, 'geofenceZoneIds': []},
  );

  Future<Map<String, dynamic>> checkIn({
    required double latitude,
    required double longitude,
    double? gpsAccuracy,
    String? geofenceZoneId,
    String? lateReason,
    String? lateReasonNotes,
    String? photoPath,
    String? shift,
  }) async {
    // uploadAttendancePhoto throws ApiException on error (including 400 no-face)
    final String? photoUrl = photoPath != null ? await uploadAttendancePhoto(photoPath) : null;
    return _request(
      () => _dio.post('/attendance/check-in', data: {
        'lat': latitude,
        'lng': longitude,
        if (gpsAccuracy != null) 'gpsAccuracy': gpsAccuracy,
        if (geofenceZoneId != null) 'geofenceZoneId': geofenceZoneId,
        if (photoUrl != null) 'photoUrl': photoUrl,
        if (lateReason != null) 'lateReason': lateReason,
        if (lateReasonNotes != null && lateReasonNotes.isNotEmpty) 'lateReasonNotes': lateReasonNotes,
        if (shift != null) 'shift': shift,
      }),
      (data) => data as Map<String, dynamic>? ?? {},
    );
  }

  Future<Map<String, dynamic>> checkOut({required String attendanceId, String? photoPath}) async {
    final String? photoUrl = photoPath != null ? await uploadAttendancePhoto(photoPath) : null;
    return _request(
      () => _dio.post('/attendance/check-out', data: {
        'attendanceId': attendanceId,
        if (photoUrl != null) 'checkOutPhotoUrl': photoUrl,
      }),
      (data) => data as Map<String, dynamic>? ?? {},
    );
  }

  Future<Map<String, dynamic>> getPendingApprovals({int page = 1, int limit = 50}) => _request(
        () => _dio.get('/leave/pending-approvals', queryParameters: {'page': page, 'limit': limit}),
        (data) => data as Map<String, dynamic>? ?? {'data': [], 'total': 0},
      );

  Future<Map<String, dynamic>> getMyApprovals({String? status, int page = 1, int limit = 50}) => _request(
        () => _dio.get('/leave/my-approvals', queryParameters: {
          'page': page,
          'limit': limit,
          if (status != null && status != 'all') 'status': status,
        }),
        (data) => data as Map<String, dynamic>? ?? {'data': [], 'total': 0},
      );

  Future<void> approveLeave(String leaveId) => _request(
        () => _dio.patch('/leave/$leaveId/approve'),
        (_) {},
      );

  Future<void> rejectLeave(String leaveId, String reason) => _request(
        () => _dio.patch('/leave/$leaveId/reject', data: {'rejectionReason': reason}),
        (_) {},
      );

  Future<Map<String, dynamic>> getLeaveRequests({int page = 1, int limit = 10}) => _request(
        () => _dio.get('/leave/my-requests', queryParameters: {'page': page, 'limit': limit}),
        (data) => data as Map<String, dynamic>? ?? {},
      );

  Future<void> submitLeaveRequest({
    required String startDate,
    required String endDate,
    required String leaveType,
    required String reason,
  }) => _request(
        () => _dio.post('/leave/request', data: {
          'startDate': startDate,
          'endDate': endDate,
          'leaveType': leaveType,
          'reason': reason,
        }),
        (_) {},
      );

  Future<Map<String, dynamic>> updateEmployee(
    String id,
    Map<String, dynamic> fields,
  ) => _request(
        () => _dio.patch('/employees/$id', data: fields),
        (data) => data as Map<String, dynamic>? ?? {},
      );

  Future<void> changePassword(String currentPassword, String newPassword) => _request(
        () => _dio.post('/auth/change-password', data: {
          'currentPassword': currentPassword,
          'newPassword': newPassword,
        }),
        (_) {},
      );

  /// Fetches only the notifications addressed to the logged-in employee.
  Future<Map<String, dynamic>> getNotifications({int limit = 20}) => _request(
        () => _dio.get('/notifications/my', queryParameters: {'limit': limit}),
        (data) => data as Map<String, dynamic>? ?? {'data': [], 'total': 0},
      );

  /// Unread count scoped to the current employee.
  Future<int> getUnreadNotificationCount() => _request(
        () => _dio.get('/notifications/my/unread-count'),
        (data) => (data as Map<String, dynamic>?)?['count'] as int? ?? 0,
      );

  Future<void> markNotificationRead(String id) => _request(
        () => _dio.patch('/notifications/$id/mark-read'),
        (_) {},
      );

  /// Mark all of the current employee's notifications as read.
  Future<void> markAllNotificationsRead() => _request(
        () => _dio.patch('/notifications/my/mark-all-read'),
        (_) {},
      );

  Future<List<Map<String, dynamic>>> getMyPerformanceGoals() => _request(
        () => _dio.get('/performance-goals/my'),
        (data) {
          final list = data is List ? data : (data as Map<String, dynamic>?)?['data'] as List? ?? [];
          return list.whereType<Map<String, dynamic>>().toList();
        },
      );

  Future<Map<String, dynamic>> getActiveAnnouncements({int skip = 0, int take = 10, String? department}) => _request(
        () => _dio.get('/announcements/active', queryParameters: {
          'skip': skip,
          'take': take,
          if (department != null) 'department': department,
        }),
        (data) => data as Map<String, dynamic>? ?? {'data': [], 'total': 0},
      );

  Future<void> markAnnouncementViewed(String id) => _request(
        () => _dio.patch('/announcements/$id/view'),
        (_) {},
      );

  /// Fetch all active dropdown categories with their values.
  Future<List<DropdownCategory>> getDropdowns() => _request(
        () => _dio.get('/dropdown-master'),
        (data) {
          final list = data is List ? data : (data as Map<String, dynamic>?)?['data'] as List? ?? [];
          return list.whereType<Map<String, dynamic>>().map(DropdownCategory.fromJson).toList();
        },
      );
}
