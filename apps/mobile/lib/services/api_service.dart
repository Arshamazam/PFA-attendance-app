import 'package:dio/dio.dart';
import '../models/user.dart';
import '../models/attendance_record.dart';
import '../models/geofence_zone.dart';
import '../models/leave_balance.dart';

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
  static const _baseUrl = 'http://127.0.0.1:3000';

  late final Dio _dio;

  ApiService() {
    _dio = Dio(
      BaseOptions(
        baseUrl: _baseUrl,
        connectTimeout: const Duration(seconds: 15),
        receiveTimeout: const Duration(seconds: 30),
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
      if (e.response?.statusCode == 401) throw const UnauthorizedException();
      final msg = (e.response?.data is Map)
          ? (e.response!.data as Map)['message']?.toString() ?? e.message ?? 'Request failed'
          : e.message ?? 'Cannot connect to server';
      throw ApiException(msg, statusCode: e.response?.statusCode);
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

  Future<Map<String, dynamic>> checkIn({
    required double latitude,
    required double longitude,
    required String geofenceZoneId,
    String? lateReason,
    String? lateReasonNotes,
    String? photoPath,
  }) => _request(
        () => _dio.post('/attendance/check-in', data: {
          'lat': latitude,
          'lng': longitude,
          'geofenceZoneId': geofenceZoneId,
        }),
        (data) => data as Map<String, dynamic>? ?? {},
      );

  Future<Map<String, dynamic>> checkOut({required String attendanceId}) => _request(
        () => _dio.post('/attendance/check-out', data: {'attendanceId': attendanceId}),
        (data) => data as Map<String, dynamic>? ?? {},
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
}
