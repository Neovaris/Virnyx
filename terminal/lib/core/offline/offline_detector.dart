// lib/core/offline/offline_detector.dart
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../features/shell/notifications/terminal_notification_provider.dart';
import '../../features/shell/notifications/terminal_notification_models.dart';

final offlineDetectorProvider = NotifierProvider<OfflineDetector, bool>(
  OfflineDetector.new,
);

class OfflineDetector extends Notifier<bool> {
  late Connectivity _connectivity;
  bool _lastNotificationWasOffline = false;

  @override
  bool build() {
    _connectivity = Connectivity();
    _initConnectivityListener();
    return false; // Assume online initially
  }

  void _initConnectivityListener() {
    _connectivity.onConnectivityChanged.listen((result) {
      final isOffline = result == ConnectivityResult.none;
      state = isOffline;
      
      // Add notifications for status changes
      if (isOffline && !_lastNotificationWasOffline) {
        // Connection lost
        ref.read(terminalNotificationsProvider.notifier).add(
          TerminalNotificationItem(
            id: 'offline_${DateTime.now().millisecondsSinceEpoch}',
            title: '📡 Connection lost - working offline',
            type: TerminalNotificationType.warning,
            createdAt: DateTime.now(),
          ),
        );
        _lastNotificationWasOffline = true;
      } else if (!isOffline && _lastNotificationWasOffline) {
        // Connection restored
        ref.read(terminalNotificationsProvider.notifier).add(
          TerminalNotificationItem(
            id: 'online_${DateTime.now().millisecondsSinceEpoch}',
            title: '✅ Connection restored',
            type: TerminalNotificationType.success,
            createdAt: DateTime.now(),
          ),
        );
        _lastNotificationWasOffline = false;
      }
    });
  }

  Future<bool> checkConnectivity() async {
    final result = await _connectivity.checkConnectivity();
    final isOffline = result == ConnectivityResult.none;
    state = isOffline;
    return !isOffline;
  }
}
