import 'dart:convert';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_client.dart';
import '../../core/api/api_provider.dart';
import '../auth/providers/auth_provider.dart';
import '../shell/notifications/terminal_notification_provider.dart';
import '../shell/notifications/terminal_notification_models.dart';

class InventoryItem {
  final String productId;
  final int onHand;
  final int lowStockThreshold;

  const InventoryItem({
    required this.productId,
    required this.onHand,
    required this.lowStockThreshold,
  });

  bool get isLowStock => onHand <= lowStockThreshold;
  bool get isOutOfStock => onHand <= 0;

  factory InventoryItem.fromJson(Map<String, dynamic> j) {
    return InventoryItem(
      productId: (j['productId'] ?? '').toString(),
      onHand: ((j['onHand'] ?? 0) as num).toInt(),
      lowStockThreshold: ((j['lowStockThreshold'] ?? 10) as num).toInt(),
    );
  }
}

class InventoryState {
  final bool loading;
  final Map<String, InventoryItem> items;
  final String? error;

  const InventoryState({
    required this.loading,
    required this.items,
    this.error,
  });

  const InventoryState.initial()
      : loading = false,
        items = const {},
        error = null;

  InventoryItem? getStock(String productId) => items[productId];

  bool isInStock(String productId) {
    final item = items[productId];
    return item != null && item.onHand > 0;
  }

  bool isLowStock(String productId) {
    final item = items[productId];
    return item != null && item.isLowStock;
  }

  InventoryState copyWith({
    bool? loading,
    Map<String, InventoryItem>? items,
    String? error,
    bool clearError = false,
  }) {
    return InventoryState(
      loading: loading ?? this.loading,
      items: items ?? this.items,
      error: clearError ? null : (error ?? this.error),
    );
  }
}

final inventoryProvider =
    NotifierProvider<InventoryController, InventoryState>(
  InventoryController.new,
);

class InventoryController extends Notifier<InventoryState> {
  late final ApiClient _client;

  @override
  InventoryState build() {
    _client = ref.read(apiProvider);
    Future.microtask(_loadInventory);
    return const InventoryState.initial();
  }

  Future<void> _loadInventory() async {
    state = state.copyWith(loading: true, clearError: true);

    try {
      final auth = ref.read(authProvider);
      if (!auth.loggedIn) {
        state = state.copyWith(
          loading: false,
          error: 'Not logged in',
          items: const {},
        );
        return;
      }

      final res = await _client.getJson('/inventory');

      final rawItems = (res['items'] ?? res['data'] ?? []) as List;

      final inventoryMap = <String, InventoryItem>{};
      final lowStockItems = <String>[];
      
      for (final item in rawItems) {
        final inv = InventoryItem.fromJson(item as Map<String, dynamic>);
        inventoryMap[inv.productId] = inv;
        if (inv.isLowStock) {
          lowStockItems.add(inv.productId);
        }
      }

      // Add notification for low stock items if any
      if (lowStockItems.isNotEmpty) {
        final count = lowStockItems.length;
        ref.read(terminalNotificationsProvider.notifier).add(
          TerminalNotificationItem(
            id: 'low_stock_${DateTime.now().millisecondsSinceEpoch}',
            title: '⚠️ $count item(s) running low on stock',
            type: TerminalNotificationType.warning,
            createdAt: DateTime.now(),
          ),
        );
      }

      state = state.copyWith(
        loading: false,
        items: inventoryMap,
        clearError: true,
      );
    } catch (e) {
      state = state.copyWith(
        loading: false,
        error: 'Inventory load error: $e',
      );
    }
  }

  Future<void> refresh() => _loadInventory();
}