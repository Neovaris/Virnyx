import 'package:flutter/foundation.dart';

import 'connectivity_service.dart';
import 'local_cache_service.dart';
import 'offline_sync_service.dart';

/// Initialize all offline-first services.
/// Call this once during app startup, typically in main() before runApp().
///
/// Usage:
/// ```dart
/// void main() async {
///   WidgetsFlutterBinding.ensureInitialized();
///   await OfflineServicesInitializer.initialize();
///   runApp(const VirnyxMobileApp());
/// }
/// ```
class OfflineServicesInitializer {
  OfflineServicesInitializer._();

  /// Initialize all offline services
  static Future<void> initialize() async {
    try {
      debugPrint('[OfflineServicesInitializer] Starting initialization...');

      // Initialize connectivity monitoring
      await ConnectivityService.instance.initialize();
      debugPrint(
        '[OfflineServicesInitializer] Connectivity service initialized',
      );

      // Initialize local cache (creates database)
      await LocalCacheService.instance.db;
      debugPrint(
        '[OfflineServicesInitializer] Local cache service initialized',
      );

      // Initialize sync manager
      OfflineSyncService.instance.initialize();
      debugPrint(
        '[OfflineServicesInitializer] Offline sync service initialized',
      );

      debugPrint('[OfflineServicesInitializer] ✅ All services initialized');
    } catch (e) {
      debugPrint('[OfflineServicesInitializer] ❌ Initialization failed: $e');
      rethrow;
    }
  }

  /// Clean up resources (call on app exit)
  static void dispose() {
    try {
      OfflineSyncService.instance.dispose();
      debugPrint('[OfflineServicesInitializer] Services disposed');
    } catch (e) {
      debugPrint('[OfflineServicesInitializer] Dispose error: $e');
    }
  }
}
