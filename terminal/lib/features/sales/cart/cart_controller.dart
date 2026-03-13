import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../auth/providers/merchant_settings_provider.dart';

final cartProvider = NotifierProvider<CartController, CartState>(CartController.new);

@immutable
class CartState {
  final Map<String, CartLine> lines; // productId -> line
  final double discountAmount; // Fixed discount in currency

  const CartState({required this.lines, this.discountAmount = 0.0});

  int get itemCount => lines.values.fold(0, (a, b) => a + b.qty);
  double get subtotal => lines.values.fold(0.0, (a, b) => a + (b.price * b.qty));

  // Discount after subtotal, before tax
  double get afterDiscount => (subtotal - discountAmount).clamp(0, double.infinity);

  // v0.1 simple tax model (0 for now, we'll wire merchant tax settings later)
  double get tax => 0.0;
  double get total => afterDiscount + tax;

  const CartState.empty() : lines = const {}, discountAmount = 0.0;
}

@immutable
class CartLine {
  final String productId;
  final String name;
  final double price;
  final int qty;

  const CartLine({
    required this.productId,
    required this.name,
    required this.price,
    required this.qty,
  });

  CartLine copyWith({int? qty}) => CartLine(
        productId: productId,
        name: name,
        price: price,
        qty: qty ?? this.qty,
      );
}

class CartController extends Notifier<CartState> {
  @override
  CartState build() => const CartState.empty();

  void load(CartState cart) {
    state = cart;
  }

  void clear() => state = const CartState.empty();

  void setDiscount(double amount) {
    state = CartState(lines: state.lines, discountAmount: amount.clamp(0, state.subtotal));
  }

  void add({
    required String productId,
    required String name,
    required double price,
    int qty = 1,
  }) {
    if (qty <= 0) return; // Validation: reject invalid quantities
    if (price < 0) return; // Validation: reject negative prices
    
    final next = Map<String, CartLine>.from(state.lines);
    final existing = next[productId];
    if (existing == null) {
      next[productId] = CartLine(productId: productId, name: name, price: price, qty: qty);
    } else {
      next[productId] = existing.copyWith(qty: existing.qty + qty);
    }
    state = CartState(lines: next, discountAmount: state.discountAmount);
  }

  void inc(String productId) {
    final line = state.lines[productId];
    if (line == null) return;
    add(productId: productId, name: line.name, price: line.price, qty: 1);
  }

  void dec(String productId) {
    final next = Map<String, CartLine>.from(state.lines);
    final line = next[productId];
    if (line == null) return;

    final newQty = line.qty - 1;
    if (newQty <= 0) {
      next.remove(productId);
    } else {
      next[productId] = line.copyWith(qty: newQty);
    }
    state = CartState(lines: next, discountAmount: state.discountAmount);
  }

  void remove(String productId) {
    final next = Map<String, CartLine>.from(state.lines);
    next.remove(productId);
    state = CartState(lines: next, discountAmount: state.discountAmount);
  }
}