import 'dart:convert';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../cart/cart_controller.dart';

final parkedSalesProvider =
    NotifierProvider<ParkedSalesController, List<ParkedSale>>(
        ParkedSalesController.new);

class ParkedSale {
  final String id;
  final DateTime createdAt;
  final CartState cart;

  const ParkedSale({
    required this.id,
    required this.createdAt,
    required this.cart,
  });

  int get itemCount => cart.itemCount;
  double get total => cart.total;

  Map<String, dynamic> toJson() => {
        'id': id,
        'createdAt': createdAt.toIso8601String(),
        'cart': {
          'lines': {
            for (final entry in cart.lines.entries)
              entry.key: {
                'productId': entry.value.productId,
                'name': entry.value.name,
                'price': entry.value.price,
                'qty': entry.value.qty,
              }
          },
          'discountAmount': cart.discountAmount,
        },
      };

  factory ParkedSale.fromJson(Map<String, dynamic> j) {
    final cartJson = j['cart'] as Map<String, dynamic>? ?? {};
    final linesJson = cartJson['lines'] as Map<String, dynamic>? ?? {};

    final lines = <String, CartLine>{};
    linesJson.forEach((key, value) {
      if (value is Map<String, dynamic>) {
        lines[key] = CartLine(
          productId: value['productId'] ?? '',
          name: value['name'] ?? '',
          price: (value['price'] as num?)?.toDouble() ?? 0,
          qty: value['qty'] ?? 1,
        );
      }
    });

    return ParkedSale(
      id: j['id'] ?? '',
      createdAt: DateTime.tryParse(j['createdAt'] ?? '') ?? DateTime.now(),
      cart: CartState(
        lines: lines,
        discountAmount: (cartJson['discountAmount'] as num?)?.toDouble() ?? 0,
      ),
    );
  }
}

class ParkedSalesController extends Notifier<List<ParkedSale>> {
  static const String _storageKey = 'vrx_parked_sales';
  int _seq = 0;

  @override
  List<ParkedSale> build() {
    _loadFromStorage();
    return const [];
  }

  Future<void> _loadFromStorage() async {
    final prefs = await SharedPreferences.getInstance();
    final jsonStr = prefs.getString(_storageKey);

    if (jsonStr == null) {
      state = const [];
      return;
    }

    try {
      final list = jsonDecode(jsonStr) as List;
      final loaded = list
          .whereType<Map<String, dynamic>>()
          .map((m) => ParkedSale.fromJson(m))
          .toList();
      state = loaded;

      // Update seq counter
      _seq = loaded.isEmpty
          ? 0
          : int.tryParse(loaded.last.id.replaceFirst('HOLD-', '')) ?? 0;
    } catch (_) {
      state = const [];
      await prefs.remove(_storageKey);
    }
  }

  Future<void> _persistToStorage() async {
    final prefs = await SharedPreferences.getInstance();
    final json = jsonEncode(state.map((s) => s.toJson()).toList());
    await prefs.setString(_storageKey, json);
  }

  void park(CartState cart) {
    if (cart.lines.isEmpty) return;
    _seq++;

    final sale = ParkedSale(
      id: 'HOLD-$_seq',
      createdAt: DateTime.now(),
      cart: cart,
    );

    state = [sale, ...state]; // newest first
    _persistToStorage();
  }

  ParkedSale? removeById(String id) {
    final existing = state.where((s) => s.id == id).toList();
    if (existing.isEmpty) return null;
    state = state.where((s) => s.id != id).toList();
    _persistToStorage();
    return existing.first;
  }

  void clearAll() {
    state = const [];
    _persistToStorage();
  }
}
