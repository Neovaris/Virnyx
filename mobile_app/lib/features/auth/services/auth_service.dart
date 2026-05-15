import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';

import '../../../shared/services/api_client.dart';
import '../models/auth_session.dart';

class AuthService {
  AuthService._();

  static final AuthService instance = AuthService._();

  static const String _sessionStorageKey = 'auth.session.v1';

  AuthSession? _currentSession;

  AuthSession? get currentSession => _currentSession;

  Future<AuthSession> login({
    required String email,
    required String password,
  }) async {
    final Map<String, dynamic> loginResponse = await ApiClient.instance.postJson(
      '/auth/login',
      <String, dynamic>{
        'email': email.trim(),
        'password': password,
      },
    );

    final String token = (loginResponse['token'] ?? '').toString();
    if (token.isEmpty) {
      throw ApiException('Missing authentication token from server response');
    }

    ApiClient.instance.setToken(token);

    final Map<String, dynamic> me = await ApiClient.instance.getJson('/auth/me');

    final AuthSession session = AuthSession(
      token: token,
      userId: (me['id'] ?? '').toString(),
      email: (me['email'] ?? email).toString(),
      fullName: (me['fullName'] ?? '').toString(),
      merchantId: (me['merchantId'] ?? '').toString(),
      storeName: me['store'] is Map<String, dynamic>
          ? (me['store']['name'] ?? '').toString()
          : null,
    );

    await _persistSession(session);
    _currentSession = session;
    return session;
  }

  Future<AuthSession?> restoreSession() async {
    final SharedPreferences prefs = await SharedPreferences.getInstance();
    final String? raw = prefs.getString(_sessionStorageKey);
    if (raw == null || raw.isEmpty) {
      _currentSession = null;
      ApiClient.instance.setToken(null);
      return null;
    }

    try {
      final Map<String, dynamic> decoded =
          jsonDecode(raw) as Map<String, dynamic>;
      final AuthSession parsed = AuthSession.fromJson(decoded);
      if (parsed.token.isEmpty) {
        await logout();
        return null;
      }

      ApiClient.instance.setToken(parsed.token);

      final Map<String, dynamic> me = await ApiClient.instance.getJson('/auth/me');
      final AuthSession refreshed = parsed.copyWith(
        userId: (me['id'] ?? parsed.userId).toString(),
        email: (me['email'] ?? parsed.email).toString(),
        fullName: (me['fullName'] ?? parsed.fullName).toString(),
        merchantId: (me['merchantId'] ?? parsed.merchantId).toString(),
        storeName: me['store'] is Map<String, dynamic>
            ? (me['store']['name'] ?? '').toString()
            : parsed.storeName,
      );

      _currentSession = refreshed;
      await _persistSession(refreshed);
      return refreshed;
    } catch (_) {
      await logout();
      return null;
    }
  }

  Future<void> logout() async {
    final SharedPreferences prefs = await SharedPreferences.getInstance();
    await prefs.remove(_sessionStorageKey);
    _currentSession = null;
    ApiClient.instance.setToken(null);
  }

  Future<void> _persistSession(AuthSession session) async {
    final SharedPreferences prefs = await SharedPreferences.getInstance();
    await prefs.setString(_sessionStorageKey, jsonEncode(session.toJson()));
  }
}
