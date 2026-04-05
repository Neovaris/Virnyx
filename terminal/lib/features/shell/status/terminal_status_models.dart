enum TerminalConnectionStatus {
  online,
  offline,
  reconnecting,
}

enum SyncHealthStatus {
  synced,
  pending,
  syncing,
  failed,
}

enum AppUpdateStatus {
  upToDate,
  available,
  downloading,
  restartRequired,
}

enum ShiftStatus {
  open,
  closed,
}

class TerminalStatusState {
  final TerminalConnectionStatus connectionStatus;
  final SyncHealthStatus syncStatus;
  final int pendingSyncCount;
  final AppUpdateStatus updateStatus;
  final ShiftStatus shiftStatus;
  final String? cashierName;
  final String terminalName;
  final String storeName;
  final String appVersion;
  final DateTime now;
  final DateTime? lastSyncAt;

  const TerminalStatusState({
    required this.connectionStatus,
    required this.syncStatus,
    required this.pendingSyncCount,
    required this.updateStatus,
    required this.shiftStatus,
    required this.cashierName,
    required this.terminalName,
    required this.storeName,
    required this.appVersion,
    required this.now,
    required this.lastSyncAt,
  });

  TerminalStatusState copyWith({
    TerminalConnectionStatus? connectionStatus,
    SyncHealthStatus? syncStatus,
    int? pendingSyncCount,
    AppUpdateStatus? updateStatus,
    ShiftStatus? shiftStatus,
    String? cashierName,
    String? terminalName,
    String? storeName,
    String? appVersion,
    DateTime? now,
    DateTime? lastSyncAt,
  }) {
    return TerminalStatusState(
      connectionStatus: connectionStatus ?? this.connectionStatus,
      syncStatus: syncStatus ?? this.syncStatus,
      pendingSyncCount: pendingSyncCount ?? this.pendingSyncCount,
      updateStatus: updateStatus ?? this.updateStatus,
      shiftStatus: shiftStatus ?? this.shiftStatus,
      cashierName: cashierName ?? this.cashierName,
      terminalName: terminalName ?? this.terminalName,
      storeName: storeName ?? this.storeName,
      appVersion: appVersion ?? this.appVersion,
      now: now ?? this.now,
      lastSyncAt: lastSyncAt ?? this.lastSyncAt,
    );
  }

  factory TerminalStatusState.initial() {
    return TerminalStatusState(
      connectionStatus: TerminalConnectionStatus.online,
      syncStatus: SyncHealthStatus.synced,
      pendingSyncCount: 0,
      updateStatus: AppUpdateStatus.upToDate,
      shiftStatus: ShiftStatus.closed,
      cashierName: null,
      terminalName: 'Terminal-01',
      storeName: 'Main Store',
      appVersion: 'Demo',
      now: DateTime.now(),
      lastSyncAt: DateTime.now(),
    );
  }
}