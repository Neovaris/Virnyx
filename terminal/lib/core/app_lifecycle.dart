// lib/core/app_lifecycle.dart
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'offline/offline_detector.dart';
import '../features/sales/offline/offline_sync_service.dart';
import '../features/receipt/receipt_print_service.dart';

/// Initialize app lifecycle listeners (offline/online, print queue retry, etc.)
class AppLifecycleManager {
  static void initialize(WidgetRef ref) {
    // Listen for connectivity changes and sync when online
    ref.listen<bool>(offlineDetectorProvider, (prev, isOffline) {
      if (prev == true && isOffline == false) {
        // Transitioned from offline to online
        debugPrint('[AppLifecycle] 🔵 Online detected, syncing...');
        ref.read(offlineSyncProvider.notifier).syncOfflineSales();
        ref.read(receiptPrintServiceProvider.notifier).retryPrintQueue();
      }
    });

    // Monitor sync state
    ref.listen<SyncState>(offlineSyncProvider, (prev, next) {
      if (next.hasPendingSales && !next.syncing) {
        debugPrint(
          '[AppLifecycle] ⏳ ${next.pendingSalesCount} sales pending sync',
        );
      }
      if (next.lastError != null) {
        debugPrint('[AppLifecycle] ⚠️ Sync error: ${next.lastError}');
      }
    });
  }
}
