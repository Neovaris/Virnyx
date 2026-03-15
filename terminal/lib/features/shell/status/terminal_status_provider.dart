import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:package_info_plus/package_info_plus.dart';

import 'terminal_status_models.dart';
import '../../../core/offline/offline_detector.dart';
import '../../sales/offline/offline_sync_service.dart';
import '../../shift/providers/shift_controller.dart';
import '../../auth/providers/auth_provider.dart';

final terminalStatusProvider =
    NotifierProvider<TerminalStatusNotifier, TerminalStatusState>(
  TerminalStatusNotifier.new,
);

class TerminalStatusNotifier extends Notifier<TerminalStatusState> {
  Timer? _clockTimer;
  String? _cachedAppVersion;

  @override
  TerminalStatusState build() {
    _startClock();
    _initializeAppVersion();
    
    ref.onDispose(() {
      _clockTimer?.cancel();
    });

    // Watch real providers for live updates
    final isOffline = ref.watch(offlineDetectorProvider);
    final syncState = ref.watch(offlineSyncProvider);
    final shift = ref.watch(shiftProvider);
    final auth = ref.watch(authProvider);

    final connectionStatus = isOffline
        ? TerminalConnectionStatus.offline
        : TerminalConnectionStatus.online;

    final syncStatus = _mapSyncStatus(syncState);
    final shiftStatus = shift.active ? ShiftStatus.open : ShiftStatus.closed;
    final cashierName = auth.userId;

    state = TerminalStatusState(
      connectionStatus: connectionStatus,
      syncStatus: syncStatus,
      pendingSyncCount: syncState.pendingSalesCount,
      updateStatus: AppUpdateStatus.upToDate,
      shiftStatus: shiftStatus,
      cashierName: cashierName,
      terminalName: 'Terminal 01',
      storeName: 'Main Store',
      appVersion: _cachedAppVersion ?? '1.0.0',
      now: DateTime.now(),
      lastSyncAt: syncState.lastSyncTime,
    );

    return state;
  }

  Future<void> _initializeAppVersion() async {
    try {
      final info = await PackageInfo.fromPlatform();
      _cachedAppVersion = info.version;
    } catch (_) {
      _cachedAppVersion = '1.0.0';
    }
  }

  void _startClock() {
    _clockTimer?.cancel();
    _clockTimer = Timer.periodic(const Duration(seconds: 1), (_) {
      state = state.copyWith(now: DateTime.now());
    });
  }

  SyncHealthStatus _mapSyncStatus(SyncState syncState) {
    if (syncState.syncing) {
      return SyncHealthStatus.syncing;
    }
    if (syncState.lastError != null) {
      return SyncHealthStatus.failed;
    }
    if (syncState.hasPendingSales) {
      return SyncHealthStatus.pending;
    }
    return SyncHealthStatus.synced;
  }
}