import '../payment/payment_method.dart';

class SaleLine {
  final String productId;
  final String name;
  final double unitPrice;
  final int qty;

  const SaleLine({
    required this.productId,
    required this.name,
    required this.unitPrice,
    required this.qty,
  });

  double get lineTotal => unitPrice * qty;
}

class CompletedSale {
  final String saleId; // e.g. S-000001
  final DateTime createdAt;

  final String? cashierId;
  final String? shiftId;
  final String? storeId;

  final PaymentMethod method;

  // Cash only (optional)
  final double? tendered;
  final double? change;

  // MoMo/Card (optional)
  final String? reference;

  final List<SaleLine> lines;
  final double subtotal;
  final double tax;
  final double total;

  const CompletedSale({
    required this.saleId,
    required this.createdAt,
    required this.method,
    required this.lines,
    required this.subtotal,
    required this.tax,
    required this.total,
    this.cashierId,
    this.shiftId,
    this.storeId,
    this.tendered,
    this.change,
    this.reference,
  });
}