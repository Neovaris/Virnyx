import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter/foundation.dart';

/// Service to monitor network connectivity status.
/// Provides real-time updates on connection state.
class ConnectivityService extends ChangeNotifier {
  ConnectivityService._();

  static final ConnectivityService instance = ConnectivityService._();

  late Connectivity _connectivity;
  bool _isOnline = true;

  bool get isOnline => _isOnline;
  bool get isOffline => !_isOnline;

  /// Initialize connectivity monitoring
  Future<void> initialize() async {
    _connectivity = Connectivity();

    // Check initial connectivity state
    try {
      final List<ConnectivityResult> result = await _connectivity
          .checkConnectivity();
      _isOnline = !result.contains(ConnectivityResult.none);
    } catch (e) {
      debugPrint('[ConnectivityService] Failed to check connectivity: $e');
      _isOnline = true; // Assume online if check fails
    }

    // Listen to connectivity changes
    try {
      _connectivity.onConnectivityChanged.listen((
        List<ConnectivityResult> result,
      ) {
        final bool wasOnline = _isOnline;
        _isOnline = !result.contains(ConnectivityResult.none);

        // Notify listeners only if state changed
        if (wasOnline != _isOnline) {
          debugPrint(
            '[ConnectivityService] Connectivity changed: ${_isOnline ? "ONLINE" : "OFFLINE"}',
          );
          notifyListeners();

          // Trigger sync if coming back online
          if (_isOnline) {
            _onOnlineRestored();
          }
        }
      });
    } catch (e) {
      debugPrint('[ConnectivityService] Failed to listen to connectivity: $e');
    }
  }

  void _onOnlineRestored() {
    // Placeholder for sync manager integration
    // Will be called when connectivity is restored
    debugPrint('[ConnectivityService] Online restored - triggering sync');
  }

  /// Get a description of current connectivity state
  String getStatusDescription() {
    if (!_isOnline) return 'Offline - Changes will sync when online';
    return 'Online';
  }

  @override
  String toString() => 'ConnectivityService(online: $_isOnline)';
}
