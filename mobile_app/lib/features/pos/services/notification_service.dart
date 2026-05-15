import 'dart:async';

import 'package:flutter/foundation.dart';

import '../../../shared/services/api_client.dart';
import '../../auth/services/auth_service.dart';
import './persistence_service.dart';

enum PosNotificationType { info, success, warning, error }

class PosNotificationItem {
  const PosNotificationItem({
    required this.id,
    required this.title,
    required this.type,
    required this.createdAt,
    this.read = false,
    this.actionLabel,
    this.saleId,
    this.refundId,
  });

  final String id;
  final String title;
  final PosNotificationType type;
  final DateTime createdAt;
  final bool read;
  final String? actionLabel;
  final String? saleId;
  final String? refundId;

  PosNotificationItem copyWith({bool? read}) {
    return PosNotificationItem(
      id: id,
      title: title,
      type: type,
      createdAt: createdAt,
      read: read ?? this.read,
      actionLabel: actionLabel,
      saleId: saleId,
      refundId: refundId,
    );
  }

  /// Serialize to JSON for persistence
  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'id': id,
      'title': title,
      'type': type.toString(),
      'createdAt': createdAt.toIso8601String(),
      'read': read,
      'actionLabel': actionLabel,
      'saleId': saleId,
      'refundId': refundId,
    };
  }

  /// Deserialize from JSON
  factory PosNotificationItem.fromJson(Map<String, dynamic> json) {
    return PosNotificationItem(
      id: (json['id'] ?? '').toString(),
      title: (json['title'] ?? '').toString(),
      type: _parseNotificationType(json['type']),
      createdAt: json['createdAt'] is String
          ? DateTime.parse(json['createdAt'] as String)
          : DateTime.now(),
      read: (json['read'] as bool?) ?? false,
      actionLabel: json['actionLabel']?.toString(),
      saleId: json['saleId']?.toString(),
      refundId: json['refundId']?.toString(),
    );
  }

  static PosNotificationType _parseNotificationType(dynamic value) {
    final String typeString = value?.toString() ?? '';
    if (typeString.contains('success')) return PosNotificationType.success;
    if (typeString.contains('warning')) return PosNotificationType.warning;
    if (typeString.contains('error')) return PosNotificationType.error;
    return PosNotificationType.info;
  }
}

class PosNotificationService extends ChangeNotifier {
  PosNotificationService._();

  static final PosNotificationService instance = PosNotificationService._();

  final List<PosNotificationItem> _items = <PosNotificationItem>[];
  Timer? _pendingRefundsTimer;
  Timer? _inventoryTimer;
  final Map<String, Timer> _refundWatchers = <String, Timer>{};
  final Map<String, String> _refundStatuses = <String, String>{};
  String? _cashierId;
  String _lowStockSignature = '';
  bool _monitoringStarted = false;

  List<PosNotificationItem> get items =>
      List<PosNotificationItem>.unmodifiable(_items);

  int get unreadCount =>
      _items.where((PosNotificationItem item) => !item.read).length;

  /// Load persisted notifications from local storage
  Future<void> loadPersistedNotifications() async {
    try {
      final List<PosNotificationItem> persisted =
          await PersistenceService.restoreNotifications();
      _items.clear();
      _items.addAll(persisted);
      notifyListeners();
    } catch (e) {
      debugPrint(
        '[NotificationService] Failed to load persisted notifications: $e',
      );
    }
  }

  void add(PosNotificationItem item) {
    _items.removeWhere(
      (PosNotificationItem existing) => existing.id == item.id,
    );
    _items.insert(0, item);
    notifyListeners();
    _saveNotifications();
  }

  void _saveNotifications() {
    unawaited(PersistenceService.saveNotifications(_items));
  }

  Future<void> startMonitoring() async {
    if (_monitoringStarted) {
      return;
    }

    _monitoringStarted = true;
    _cashierId = await _resolveCashierId();

    await refreshMonitoring();

    _pendingRefundsTimer = Timer.periodic(const Duration(seconds: 15), (_) {
      unawaited(_syncPendingRefunds());
    });

    _inventoryTimer = Timer.periodic(const Duration(minutes: 2), (_) {
      unawaited(_syncInventoryNotifications());
    });
  }

  Future<void> refreshMonitoring() async {
    _cashierId ??= await _resolveCashierId();
    await Future.wait(<Future<void>>[
      _syncPendingRefunds(),
      _syncInventoryNotifications(),
    ]);
  }

  void stopMonitoring() {
    _pendingRefundsTimer?.cancel();
    _inventoryTimer?.cancel();
    _pendingRefundsTimer = null;
    _inventoryTimer = null;
    _monitoringStarted = false;
    stopAllWatchers();
    _cashierId = null;
    _lowStockSignature = '';
  }

  Future<String?> _resolveCashierId() async {
    final String cachedId = (AuthService.instance.currentSession?.userId ?? '')
        .trim();
    if (cachedId.isNotEmpty) {
      return cachedId;
    }

    try {
      final session = await AuthService.instance.restoreSession();
      final String restoredId = (session?.userId ?? '').trim();
      if (restoredId.isNotEmpty) {
        return restoredId;
      }
    } catch (_) {
      // Continue with auth/me fallback.
    }

    try {
      final Map<String, dynamic> me = await ApiClient.instance.getJson(
        '/auth/me',
      );
      final Map<String, dynamic>? user = me['user'] is Map<String, dynamic>
          ? me['user'] as Map<String, dynamic>
          : null;
      final String id = (user?['id'] ?? me['id'] ?? me['userId'] ?? '')
          .toString()
          .trim();
      if (id.isNotEmpty) {
        return id;
      }
    } catch (_) {
      // Leave as null.
    }

    return null;
  }

  Future<void> _syncPendingRefunds() async {
    final String? cashierId = _cashierId ?? await _resolveCashierId();
    if (cashierId == null || cashierId.isEmpty) {
      return;
    }

    _cashierId = cashierId;

    try {
      final Map<String, dynamic> response = await ApiClient.instance.getJson(
        '/refunds?status=PENDING_APPROVAL&limit=100',
      );

      final List<dynamic> rawRefunds =
          (response['refunds'] as List<dynamic>?) ?? <dynamic>[];

      for (final dynamic raw in rawRefunds) {
        if (raw is! Map) {
          continue;
        }

        final Map<String, dynamic> refund = Map<String, dynamic>.from(raw);
        final String refundCashierId = (refund['cashierId'] ?? '')
            .toString()
            .trim();
        if (refundCashierId != cashierId) {
          continue;
        }

        final String refundId = (refund['id'] ?? '').toString().trim();
        if (refundId.isEmpty) {
          continue;
        }

        final String saleId = refund['sale'] is Map<String, dynamic>
            ? ((refund['sale'] as Map<String, dynamic>)['id'] ?? '').toString()
            : (refund['saleId'] ?? '').toString();

        _refundStatuses[refundId] = 'PENDING_APPROVAL';
        await watchRefundForApproval(refundId: refundId, saleId: saleId);
      }
    } catch (_) {
      // Keep background monitoring resilient.
    }
  }

  Future<void> _syncInventoryNotifications() async {
    try {
      final Map<String, dynamic> response = await ApiClient.instance.getJson(
        '/reports/low-stock?limit=50',
      );

      final List<dynamic> rawItems =
          (response['items'] as List<dynamic>?) ?? <dynamic>[];

      if (rawItems.isEmpty) {
        return;
      }

      final List<Map<String, dynamic>> items = rawItems
          .whereType<Map>()
          .map((Map item) => Map<String, dynamic>.from(item))
          .toList();

      final String signature = items
          .map(
            (Map<String, dynamic> item) =>
                '${item['id'] ?? item['productId']}:${item['qtyOnHand']}',
          )
          .join('|');

      if (signature == _lowStockSignature) {
        return;
      }

      _lowStockSignature = signature;

      final List<String> names = items
          .map(
            (Map<String, dynamic> item) => (item['name'] ?? 'Item').toString(),
          )
          .take(3)
          .toList();
      final String suffix = items.length > 3 ? ', ...' : '';

      add(
        PosNotificationItem(
          id: 'low-stock-summary',
          title:
              'Low stock: ${items.length} item(s) running low${names.isEmpty ? '' : ' (${names.join(', ')}$suffix)'}',
          type: PosNotificationType.warning,
          createdAt: DateTime.now(),
        ),
      );
    } catch (_) {
      // Keep background monitoring resilient.
    }
  }

  void dismissAll() {
    _items.clear();
    notifyListeners();
    _saveNotifications();
  }

  void markAllRead() {
    if (_items.isEmpty) return;
    for (int i = 0; i < _items.length; i++) {
      if (!_items[i].read) {
        _items[i] = _items[i].copyWith(read: true);
      }
    }
    notifyListeners();
    _saveNotifications();
  }

  void remove(String id) {
    _items.removeWhere((PosNotificationItem item) => item.id == id);
    notifyListeners();
    _saveNotifications();
  }

  Future<void> watchRefundForApproval({
    required String refundId,
    required String saleId,
  }) async {
    if (_refundWatchers.containsKey(refundId)) {
      return;
    }

    _refundStatuses[refundId] = 'PENDING_APPROVAL';

    final Timer timer = Timer.periodic(const Duration(seconds: 5), (
      Timer t,
    ) async {
      try {
        final Map<String, dynamic> response = await ApiClient.instance.getJson(
          '/refunds/$refundId',
        );

        final dynamic refundRaw = response['refund'];
        final String? statusRaw = refundRaw is Map<String, dynamic>
            ? (refundRaw['approvalStatus'] ?? refundRaw['status'])?.toString()
            : null;
        final String status = (statusRaw ?? '').trim().toUpperCase();

        if (status.isEmpty) {
          return;
        }

        final String lastStatus =
            (_refundStatuses[refundId] ?? 'PENDING_APPROVAL').toUpperCase();

        if (lastStatus == 'PENDING_APPROVAL' && status != 'PENDING_APPROVAL') {
          if (status == 'APPROVED') {
            final PosNotificationItem n = PosNotificationItem(
              id: 'refund-approved-$refundId',
              title:
                  'Refund approved for sale ${saleId.substring(0, saleId.length > 8 ? 8 : saleId.length)}',
              type: PosNotificationType.success,
              createdAt: DateTime.now(),
              actionLabel: 'View Details',
              saleId: saleId,
              refundId: refundId,
            );
            add(n);
          } else if (status == 'REJECTED') {
            final PosNotificationItem n = PosNotificationItem(
              id: 'refund-rejected-$refundId',
              title:
                  'Refund rejected for sale ${saleId.substring(0, saleId.length > 8 ? 8 : saleId.length)}',
              type: PosNotificationType.warning,
              createdAt: DateTime.now(),
              actionLabel: 'View Details',
              saleId: saleId,
              refundId: refundId,
            );
            add(n);
          }

          stopWatchingRefund(refundId);
          return;
        }

        _refundStatuses[refundId] = status;
      } catch (_) {
        // Keep polling; temporary API errors shouldn't stop watchers.
      }
    });

    _refundWatchers[refundId] = timer;
  }

  void stopWatchingRefund(String refundId) {
    _refundWatchers.remove(refundId)?.cancel();
    _refundStatuses.remove(refundId);
  }

  void stopAllWatchers() {
    for (final Timer timer in _refundWatchers.values) {
      timer.cancel();
    }
    _refundWatchers.clear();
    _refundStatuses.clear();
  }
}
