import 'pos_product.dart';

class CartItem {
  const CartItem({
    required this.product,
    required this.quantity,
    required this.unitPrice,
    this.discount = 0,
  });

  final PosProduct product;
  final int quantity;
  final double unitPrice;
  final double discount; // per item or total (your choice)

  double get subtotal => unitPrice * quantity;

  double get total => subtotal - discount;

  CartItem copyWith({
    int? quantity,
    double? unitPrice,
    double? discount,
  }) {
    return CartItem(
      product: product,
      quantity: quantity ?? this.quantity,
      unitPrice: unitPrice ?? this.unitPrice,
      discount: discount ?? this.discount,
    );
  }

  CartItem increaseQty() {
    return copyWith(quantity: quantity + 1);
  }

  CartItem decreaseQty() {
    return copyWith(quantity: quantity > 1 ? quantity - 1 : 1);
  }

  factory CartItem.fromProduct(PosProduct product) {
    return CartItem(
      product: product,
      quantity: 1,
      unitPrice: product.price,
    );
  }
}