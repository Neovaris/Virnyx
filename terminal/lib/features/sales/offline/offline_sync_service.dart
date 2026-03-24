// lib/features/sales/offline/offline_sync_service.dart
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/api/api_provider.dart';
import '../../../core/offline/offline_detector.dart';
import '../../../core/offline/offline_db.dart';
import '../../../core/offline/offline_queue_models.dart';
import '../history/sales_api.dart';
import '../../../core/logging/error_logger.dart';
import '../../shell/notifications/terminal_notification_provider.dart';
import '../../shell/notifications/terminal_notification_models.dart';

final offlineSyncProvider = NotifierProvider<OfflineSyncService, SyncState>(
  OfflineSyncService.new,
);

class SyncState {
  final bool syncing;
  final bool hasPendingSales;
  final int pendingSalesCount;
  final String? lastError;
  final DateTime? lastSyncTime;

  const SyncState({
    required this.syncing,
    required this.hasPendingSales,
    this.pendingSalesCount = 0,
    this.lastError,
    this.lastSyncTime,
  });

  const SyncState.initial()
      : syncing = false,
        hasPendingSales = false,
        pendingSalesCount = 0,
        lastError = null,
        lastSyncTime = null;

  SyncState copyWith({
    bool? syncing,
    bool? hasPendingSales,
    int? pendingSalesCount,
    String? lastError,
    DateTime? lastSyncTime,
    bool clearError = false,
  }) {
    return SyncState(
      syncing: syncing ?? this.syncing,
      hasPendingSales: hasPendingSales ?? this.hasPendingSales,
      pendingSalesCount: pendingSalesCount ?? this.pendingSalesCount,
      lastError: clearError ? null : (lastError ?? this.lastError),
      lastSyncTime: lastSyncTime ?? this.lastSyncTime,
    );
  }
}

class OfflineSyncService extends Notifier<SyncState> {
  late final OfflineDb _db;
  late final SalesApi _salesApi;

  @override
  SyncState build() {
    _db = OfflineDb();
    _salesApi = ref.read(salesApiProvider);
    _checkPendingSales();
    return const SyncState.initial();
  }

  Future<void> _checkPendingSales() async {
    final queue = await _db.getSalesQueue();
    state = state.copyWith(
      hasPendingSales: queue.isNotEmpty,
      pendingSalesCount: queue.length,
    );
  }

  Future<void> syncOfflineSales() async {
    final isOnline = await ref.read(offlineDetectorProvider.notifier).checkConnectivity();
    if (!isOnline) {
      ref.read(terminalNotificationsProvider.notifier).add(
        TerminalNotificationItem(
          id: 'offline_mode_${DateTime.now().millisecondsSinceEpoch}',
          title: '📡 No internet connection - working offline',
          type: TerminalNotificationType.info,
          createdAt: DateTime.now(),
        ),
      );
      state = state.copyWith(
        lastError: 'No internet connection',
        clearError: false,
      );
      return;
    }

    state = state.copyWith(syncing: true, clearError: true);

    try {
      final queue = await _db.getSalesQueue();
      List<QueuedSale> synced = [];
      List<QueuedSale> failed = [];

      for (final queued in queue) {
        if (queued.synced) continue; // Skip already synced

        try {
          // Attempt to submit the sale
          await _salesApi.createSaleRaw(queued.payload);

          // Mark as synced
          final updated = queued.copyWith(
            synced: true,
            syncAttempts: queued.syncAttempts + 1,
          );
          await _db.updateSale(updated);
          synced.add(updated);

          debugPrint(
            '[OfflineSync] ✅ Synced sale ${queued.id} (tempId: ${queued.tempId})',
          );
        } catch (e) {
          failed.add(queued);
          final updated = queued.copyWith(
            syncError: e.toString(),
            syncAttempts: queued.syncAttempts + 1,
            lastSyncAttempt: DateTime.now(),
          );
          await _db.updateSale(updated);

          ErrorLogger.logBusinessError(
            'OfflineSync',
            'Failed to sync sale: $e',
            details: {'saleId': queued.id, 'attempts': updated.syncAttempts},
          );
        }
      }

      // Clean up synced sales
      await _db.clearSyncedSales();

      final remaining = failed.length;
      
      // Add notifications for sync results
      if (synced.isNotEmpty) {
        ref.read(terminalNotificationsProvider.notifier).add(
          TerminalNotificationItem(
            id: 'sync_success_${DateTime.now().millisecondsSinceEpoch}',
            title: '✅ ${synced.length} offline sale(s) synced successfully',
            type: TerminalNotificationType.success,
            createdAt: DateTime.now(),
          ),
        );
      }
      
      if (failed.isNotEmpty) {
        ref.read(terminalNotificationsProvider.notifier).add(
          TerminalNotificationItem(
            id: 'sync_failure_${DateTime.now().millisecondsSinceEpoch}',
            title: '⚠️ ${failed.length} sale(s) failed to sync - will retry',
            type: TerminalNotificationType.warning,
            createdAt: DateTime.now(),
          ),
        );
      }
      
      state = state.copyWith(
        syncing: false,
        hasPendingSales: remaining > 0,
        pendingSalesCount: remaining,
        lastSyncTime: DateTime.now(),
        lastError: remaining > 0
            ? '$synced.length synced, $remaining still pending'
            : null,
      );
    } catch (e) {
      ErrorLogger.logBusinessError(
        'OfflineSync',
        'Sync batch failed: $e',
      );
      
      // Add notification for sync error
      ref.read(terminalNotificationsProvider.notifier).add(
        TerminalNotificationItem(
          id: 'sync_error_${DateTime.now().millisecondsSinceEpoch}',
          title: '❌ Sync failed: ${e.toString().split(':').last.trim()}',
          type: TerminalNotificationType.error,
          createdAt: DateTime.now(),
        ),
      );
      
      state = state.copyWith(
        syncing: false,
        lastError: e.toString(),
      );
    }
  }

  Future<void> clearPendingSales() async {
    await _db.clearSyncedSales();
    state = const SyncState.initial();
  }
}
