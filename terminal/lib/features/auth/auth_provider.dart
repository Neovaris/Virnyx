import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_client.dart';
import '../../core/api/api_provider.dart';
import '../../core/session/session_store.dart';
import 'auth_api.dart';

class AuthState {
  final bool loading;
  final bool loggedIn;
  final String? token;
  final String? userId; // email/username or id
  final String? role;   // cashier/manager/admin

  const AuthState({
    required this.loading,
    required this.loggedIn,
    this.token,
    this.userId,
    this.role,
  });

  const AuthState.loggedOut()
      : loading = false,
        loggedIn = false,
        token = null,
        userId = null,
        role = null;

  AuthState copyWith({
    bool? loading,
    bool? loggedIn,
    String? token,
    String? userId,
    String? role,
  }) {
    return AuthState(
      loading: loading ?? this.loading,
      loggedIn: loggedIn ?? this.loggedIn,
      token: token ?? this.token,
      userId: userId ?? this.userId,
      role: role ?? this.role,
    );
  }
}

final authProvider = NotifierProvider<AuthController, AuthState>(AuthController.new);

class AuthController extends Notifier<AuthState> {
  late final ApiClient _api;
  late final SessionStore _store;
  late final AuthApi _authApi;

  @override
  AuthState build() {
    _api = ref.read(apiProvider);
    _store = ref.read(sessionStoreProvider);
    _authApi = AuthApi(_api);

    _restore();
    return const AuthState.loggedOut().copyWith(loading: true);
  }

  Future<void> _restore() async {
    final token = await _store.loadToken();
    if (token == null || token.isEmpty) {
      state = const AuthState.loggedOut();
      return;
    }

    _api.token = token;
    try {
      final res = await _authApi.me();

      // Expecting { user: {...} } OR direct user payload depending on your handler
      final user = (res['user'] is Map)
          ? (res['user'] as Map).cast<String, dynamic>()
          : res.cast<String, dynamic>();

      final role = (user['role'] ?? 'cashier').toString();
      final userId = (user['email'] ?? user['username'] ?? user['id'] ?? 'user').toString();

      state = AuthState(
        loading: false,
        loggedIn: true,
        token: token,
        userId: userId,
        role: role,
      );
    } catch (_) {
      // token invalid/expired
      await logout();
    }
  }

  Future<void> login({required String email, required String password}) async {
    state = state.copyWith(loading: true);

    final res = await _authApi.login(email: email, password: password);

    // Adjust token key if your loginHandler uses a different name
    final token = (res['token'] ?? res['accessToken'] ?? '').toString();
    if (token.isEmpty) {
      state = state.copyWith(loading: false);
      throw ApiException('Login succeeded but token missing');
    }

    _api.token = token;
    await _store.saveToken(token);

    // Immediately fetch /me so we get role + user info consistently
    final meRes = await _authApi.me();
    final user = (meRes['user'] is Map)
        ? (meRes['user'] as Map).cast<String, dynamic>()
        : meRes.cast<String, dynamic>();

    final role = (user['role'] ?? 'cashier').toString();
    final userId = (user['email'] ?? user['username'] ?? user['id'] ?? email).toString();

    state = AuthState(
      loading: false,
      loggedIn: true,
      token: token,
      userId: userId,
      role: role,
    );
  }

  Future<void> logout() async {
    await _store.clear();
    _api.token = null;
    state = const AuthState.loggedOut();
  }
}