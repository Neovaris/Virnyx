import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/api_client.dart';
import '../../../core/api/api_provider.dart';
import '../../../core/session/session_store.dart';
import '../../../core/logging/error_logger.dart';
import '../data/auth_api.dart';
import 'merchant_settings_provider.dart';
import '../../shift/providers/shift_controller.dart';
import '../../shift/data/shift_api.dart';
import '../../sales/offline/offline_sync_service.dart';
import '../../sales/catalog/catalog_provider.dart';
import '../../sales/cart/cart_controller.dart';
import '../../inventory/inventory_provider.dart';

class AuthState {
  final bool initialized;
  final bool loading;
  final bool loggedIn;
  final String? token;
  final String? userId;
  final String? role;

  const AuthState({
    required this.initialized,
    required this.loading,
    required this.loggedIn,
    this.token,
    this.userId,
    this.role,
  });

  const AuthState.loggedOut({this.initialized = false, this.loading = false})
    : loggedIn = false,
      token = null,
      userId = null,
      role = null;

  AuthState copyWith({
    bool? initialized,
    bool? loading,
    bool? loggedIn,
    String? token,
    String? userId,
    String? role,
    bool clearToken = false,
    bool clearUserId = false,
    bool clearRole = false,
  }) {
    return AuthState(
      initialized: initialized ?? this.initialized,
      loading: loading ?? this.loading,
      loggedIn: loggedIn ?? this.loggedIn,
      token: clearToken ? null : (token ?? this.token),
      userId: clearUserId ? null : (userId ?? this.userId),
      role: clearRole ? null : (role ?? this.role),
    );
  }
}

final authProvider = NotifierProvider<AuthController, AuthState>(
  AuthController.new,
);

class AuthController extends Notifier<AuthState> {
  late final ApiClient _api;
  late final SessionStore _store;
  late final AuthApi _authApi;

  @override
  AuthState build() {
    _api = ref.read(apiProvider);
    _store = ref.read(sessionStoreProvider);
    _authApi = AuthApi(_api);

    return const AuthState.loggedOut();
  }

  Future<void> restoreSession() async {
    state = state.copyWith(loading: true);

    final token = await _store.loadToken();
    if (token == null || token.isEmpty) {
      _api.token = null;
      state = const AuthState.loggedOut(initialized: true, loading: false);
      return;
    }

    _api.token = token;

    try {
      final res = await _authApi.me();

      final user = (res['user'] is Map)
          ? (res['user'] as Map).cast<String, dynamic>()
          : res.cast<String, dynamic>();

      final role = (user['role'] ?? 'cashier').toString();
      final userId = (user['email'] ?? user['username'] ?? user['id'] ?? 'user')
          .toString();

      state = AuthState(
        initialized: true,
        loading: false,
        loggedIn: true,
        token: token,
        userId: userId,
        role: role,
      );

      // Load merchant settings after successful session restore
      await ref.read(merchantSettingsProvider.notifier).loadSettings();
      ref.read(merchantSettingsProvider.notifier).startPeriodicRefresh();
    } catch (_) {
      await _store.clear();
      _api.token = null;
      state = const AuthState.loggedOut(initialized: true, loading: false);
    }
  }

  Future<void> login({required String email, required String password}) async {
    state = state.copyWith(loading: true);

    try {
      final res = await _authApi.login(email: email, password: password);

      final token = (res['token'] ?? res['accessToken'] ?? '').toString();
      if (token.isEmpty) {
        ErrorLogger.logBusinessError('Login', 'Token missing from response');
        state = state.copyWith(loading: false, initialized: true);
        throw ApiException('Login succeeded but token missing');
      }

      _api.token = token;
      await _store.saveToken(token);

      final meRes = await _authApi.me();
      final user = (meRes['user'] is Map)
          ? (meRes['user'] as Map).cast<String, dynamic>()
          : meRes.cast<String, dynamic>();

      final role = (user['role'] ?? 'cashier').toString();
      final userId = (user['email'] ?? user['username'] ?? user['id'] ?? email)
          .toString();

      state = AuthState(
        initialized: true,
        loading: false,
        loggedIn: true,
        token: token,
        userId: userId,
        role: role,
      );

      // Load merchant settings after successful login
      await ref.read(merchantSettingsProvider.notifier).loadSettings();
      ref.read(merchantSettingsProvider.notifier).startPeriodicRefresh();

      // Refresh product catalog and inventory for new merchant
      await ref.read(catalogProvider.notifier).refresh();
      await ref.read(inventoryProvider.notifier).refresh();

      // Auto-fetch current shift session if any exists
      try {
        final shiftApi = ShiftApi(ref);
        final currentSession = await shiftApi.getActiveShift();
        if (currentSession != null) {
          await ref
              .read(shiftProvider.notifier)
              .setOpenedShift(
                shiftId: currentSession.id,
                cashierId: currentSession.cashierId ?? userId,
                openingCash: currentSession.openingCash,
                openedAt: currentSession.openedAt,
              );
        }
      } catch (_) {
        // OK if no active shift - user will open one
      }
    } catch (e, st) {
      ErrorLogger.logBusinessError(
        'Login',
        'Login failed for $email',
        details: {'error': e.toString()},
      );
      state = state.copyWith(loading: false, initialized: true);
      rethrow;
    }
  }

  Future<void> logout() async {
    // Clear local auth artifacts first.
    await _store.clear();
    _api.token = null;

    // Ensure shift state is always reset, even when logout is triggered from
    // screens that are not shift-aware.
    await ref.read(shiftProvider.notifier).closeShift();

    // Clear in-memory cart/session data.
    ref.read(cartProvider.notifier).clear();

    // Clear the offline sync queue for the old merchant
    final syncService = ref.read(offlineSyncProvider.notifier);
    await syncService.clearPendingSales();

    // Clear cached merchant-specific data
    ref.read(merchantSettingsProvider.notifier).stopPeriodicRefresh();
    ref.invalidate(catalogProvider);
    ref.invalidate(inventoryProvider);
    ref.invalidate(merchantSettingsProvider);

    state = const AuthState.loggedOut(initialized: true, loading: false);
  }
}
