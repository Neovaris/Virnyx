// lib/core/offline/offline_queue_models.dart
import 'package:uuid/uuid.dart';

/// Queued sale waiting to sync when offline
class QueuedSale {
  final String id;
  final String tempId; // Unique local ID for idempotency
  final Map<String, dynamic> payload;
  final DateTime queuedAt;
  final DateTime? lastSyncAttempt;
  final int syncAttempts;
  final String? syncError;
  final bool synced;

  const QueuedSale({
    required this.id,
    required this.tempId,
    required this.payload,
    required this.queuedAt,
    this.lastSyncAttempt,
    this.syncAttempts = 0,
    this.syncError,
    this.synced = false,
  });

  QueuedSale copyWith({
    String? id,
    String? tempId,
    Map<String, dynamic>? payload,
    DateTime? queuedAt,
    DateTime? lastSyncAttempt,
    int? syncAttempts,
    String? syncError,
    bool? synced,
    bool clearError = false,
  }) {
    return QueuedSale(
      id: id ?? this.id,
      tempId: tempId ?? this.tempId,
      payload: payload ?? this.payload,
      queuedAt: queuedAt ?? this.queuedAt,
      lastSyncAttempt: lastSyncAttempt ?? this.lastSyncAttempt,
      syncAttempts: syncAttempts ?? this.syncAttempts,
      syncError: clearError ? null : (syncError ?? this.syncError),
      synced: synced ?? this.synced,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'tempId': tempId,
        'payload': payload,
        'queuedAt': queuedAt.toIso8601String(),
        'lastSyncAttempt': lastSyncAttempt?.toIso8601String(),
        'syncAttempts': syncAttempts,
        'syncError': syncError,
        'synced': synced,
      };

  factory QueuedSale.fromJson(Map<String, dynamic> j) {
    return QueuedSale(
      id: j['id'] ?? '',
      tempId: j['tempId'] ?? '',
      payload: Map<String, dynamic>.from(j['payload'] as Map? ?? {}),
      queuedAt: DateTime.tryParse(j['queuedAt'] ?? '') ?? DateTime.now(),
      lastSyncAttempt: j['lastSyncAttempt'] == null
          ? null
          : DateTime.tryParse(j['lastSyncAttempt']),
      syncAttempts: j['syncAttempts'] ?? 0,
      syncError: j['syncError'],
      synced: j['synced'] ?? false,
    );
  }
}

/// Queued receipt print job (when printer unavailable)
class QueuedReceipt {
  final String id;
  final String saleId;
  final Map<String, dynamic> saleData;
  final DateTime queuedAt;
  final int printAttempts;
  final String? lastError;
  final bool printed;

  const QueuedReceipt({
    required this.id,
    required this.saleId,
    required this.saleData,
    required this.queuedAt,
    this.printAttempts = 0,
    this.lastError,
    this.printed = false,
  });

  QueuedReceipt copyWith({
    String? id,
    String? saleId,
    Map<String, dynamic>? saleData,
    DateTime? queuedAt,
    int? printAttempts,
    String? lastError,
    bool? printed,
    bool clearError = false,
  }) {
    return QueuedReceipt(
      id: id ?? this.id,
      saleId: saleId ?? this.saleId,
      saleData: saleData ?? this.saleData,
      queuedAt: queuedAt ?? this.queuedAt,
      printAttempts: printAttempts ?? this.printAttempts,
      lastError: clearError ? null : (lastError ?? this.lastError),
      printed: printed ?? this.printed,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'saleId': saleId,
        'saleData': saleData,
        'queuedAt': queuedAt.toIso8601String(),
        'printAttempts': printAttempts,
        'lastError': lastError,
        'printed': printed,
      };

  factory QueuedReceipt.fromJson(Map<String, dynamic> j) {
    return QueuedReceipt(
      id: j['id'] ?? '',
      saleId: j['saleId'] ?? '',
      saleData: Map<String, dynamic>.from(j['saleData'] as Map? ?? {}),
      queuedAt: DateTime.tryParse(j['queuedAt'] ?? '') ?? DateTime.now(),
      printAttempts: j['printAttempts'] ?? 0,
      lastError: j['lastError'],
      printed: j['printed'] ?? false,
    );
  }
}

/// Generate unique ID for idempotency
String generateTempSaleId() => const Uuid().v4();
