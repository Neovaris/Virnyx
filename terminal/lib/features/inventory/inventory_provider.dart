import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/api_config.dart';
import '../../auth/providers/auth_provider.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';

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
      onHand: (j['onHand'] ?? 0) as int,
      lowStockThreshold: (j['lowStockThreshold'] ?? 10) as int,
    );
  }
}

class InventoryState {
  final bool loading;
  final Map<String, InventoryItem> items; // productId -> inventory
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
    NotifierProvider<InventoryController, InventoryState>(InventoryController.new);

class InventoryController extends Notifier<InventoryState> {
  final String _baseUrl = ApiConfig.baseUrl;

  @override
  InventoryState build() {
    Future.microtask(_loadInventory);
    return const InventoryState.initial();
  }

  Future<void> _loadInventory() async {
    state = state.copyWith(loading: true, clearError: true);

    try {
      final auth = ref.read(authProvider);
      final token = auth.token;

      if (token == null || token.isEmpty) {
        state = state.copyWith(
          loading: false,
          error: 'Not logged in',
          items: const {},
        );
        return;
      }

      final uri = Uri.parse('$_baseUrl/inventory');
      final res = await http.get(
        uri,
        headers: {
          'Authorization': 'Bearer $token',
          'Content-Type': 'application/json',
        },
      );

      if (res.statusCode < 200 || res.statusCode >= 300) {
        state = state.copyWith(
          loading: false,
          error: 'Failed to load inventory',
        );
        return;
      }

      final data = jsonDecode(res.body);
      final items = (data['items'] ?? data ?? []) as List;

      final inventoryMap = <String, InventoryItem>{};
      for (final item in items) {
        final inv = InventoryItem.fromJson(item as Map<String, dynamic>);
        inventoryMap[inv.productId] = inv;
      }

      state = state.copyWith(
        loading: false,
        items: inventoryMap,
      );
    } catch (e) {
      state = state.copyWith(
        loading: false,
        error: 'Inventory load error: $e',
      );
    }
  }

  /// Refresh inventory (pull latest from server)
  Future<void> refresh() => _loadInventory();
}
