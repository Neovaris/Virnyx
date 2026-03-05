import 'package:flutter_riverpod/flutter_riverpod.dart';
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
}

class ParkedSalesController extends Notifier<List<ParkedSale>> {
  int _seq = 0;

  @override
  List<ParkedSale> build() => const [];

  void park(CartState cart) {
    if (cart.lines.isEmpty) return;
    _seq++;

    final sale = ParkedSale(
      id: 'HOLD-$_seq',
      createdAt: DateTime.now(),
      cart: cart,
    );

    state = [sale, ...state]; // newest first
  }

  ParkedSale? removeById(String id) {
    final existing = state.where((s) => s.id == id).toList();
    if (existing.isEmpty) return null;
    state = state.where((s) => s.id != id).toList();
    return existing.first;
  }

  void clearAll() => state = const [];
}