import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../models/user.dart';
import '../services/api_service.dart';

class AuthProvider extends ChangeNotifier {
  static const _tokenKey = 'auth_token';
  static const _userKey = 'auth_user';

  final ApiService _api;
  final FlutterSecureStorage _storage;

  User? _user;
  String? _token;
  bool _isLoading = false;
  String? _errorMessage;

  AuthProvider(this._api, this._storage);

  User? get user => _user;
  String? get token => _token;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;
  bool get isAuthenticated => _token != null && _token!.isNotEmpty;

  Future<void> loadStoredSession() async {
    final token = await _storage.read(key: _tokenKey);
    final userJson = await _storage.read(key: _userKey);

    if (token != null && userJson != null) {
      _token = token;
      _api.setToken(token);
      try {
        final decoded = jsonDecode(userJson) as Map<String, dynamic>;
        _user = User.fromJson(decoded);
      } catch (_) {
        // stored user JSON is malformed; clear and force re-login
        await _clearSession();
        return;
      }
      notifyListeners();
    }
  }

  Future<bool> login(String email, String password) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final data = await _api.login(email.trim(), password);

      final token = data['access_token'] as String? ?? data['token'] as String? ?? '';
      if (token.isEmpty) throw const ApiException('Invalid server response');

      _token = token;
      _api.setToken(token);

      // Always fetch full profile so we get profilePhotoUrl and geofenceZoneIds
      _user = await _api.getProfile();

      await _storage.write(key: _tokenKey, value: token);
      await _storage.write(key: _userKey, value: jsonEncode({
        'id': _user!.id,
        'name': _user!.name,
        'email': _user!.email,
        'role': _user!.role,
        'employeeId': _user!.employeeId,
        'designation': _user!.designation,
        'profilePhotoUrl': _user!.profilePhotoUrl,
        'geofenceZoneIds': _user!.geofenceZoneIds,
        'employeeCode': _user!.employeeId,
      }));

      _isLoading = false;
      notifyListeners();
      return true;
    } on ApiException catch (e) {
      _isLoading = false;
      _errorMessage = e.message;
      notifyListeners();
      return false;
    } catch (e) {
      _isLoading = false;
      _errorMessage = 'Login failed. Please try again.';
      notifyListeners();
      return false;
    }
  }

  Future<void> changePassword(String currentPassword, String newPassword) =>
      _api.changePassword(currentPassword, newPassword);

  Future<void> logout() async {
    await _clearSession();
    notifyListeners();
  }

  Future<void> _clearSession() async {
    _token = null;
    _user = null;
    _api.setToken(null);
    await _storage.delete(key: _tokenKey);
    await _storage.delete(key: _userKey);
  }
}
