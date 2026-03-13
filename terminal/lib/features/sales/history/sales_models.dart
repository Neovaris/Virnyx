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

 factory SaleLine.fromJson(Map<String, dynamic> j) {
    final priceRaw = j['unitPrice'] ?? j['priceSnap'];
    return SaleLine(
      productId: (j['productId'] ?? '').toString(),
      name: (j['name'] ?? j['nameSnap'] ?? '').toString(),
      unitPrice: (priceRaw as num?)?.toDouble() ?? 0,
      qty: (j['qty'] as num?)?.toInt() ?? 0,
    );
  }

  Map<String, dynamic> toJson() => {
        'productId': productId,
        'name': name,
        'unitPrice': unitPrice,
        'qty': qty,
      };
}

class Sale {
  final String id;
  final String? receiptNo;
  final DateTime createdAt;
  final PaymentMethod method;
  final double subtotal;
  final double tax;
  final double total;

  final double? tendered;
  final double? change;
  final String? reference;

  final String? cashierId;
  final String? shiftId;
  final String? storeId;

  final List<SaleLine> lines;

  const Sale({
    required this.id,
    required this.createdAt,
    required this.method,
    required this.subtotal,
    required this.tax,
    required this.total,
    required this.lines,
    this.receiptNo,
    this.tendered,
    this.change,
    this.reference,
    this.cashierId,
    this.shiftId,
    this.storeId,
  });

  factory Sale.fromJson(Map<String, dynamic> j) {
    final linesRaw = (j['lines'] as List?) ?? (j['items'] as List?) ?? const [];
    final paymentsRaw = (j['payments'] as List?) ?? const [];

    Map<String, dynamic>? firstPayment;
    if (paymentsRaw.isNotEmpty && paymentsRaw.first is Map) {
      firstPayment = Map<String, dynamic>.from(paymentsRaw.first as Map);
    }

    return Sale(
      id: (j['id'] ?? j['saleId'] ?? '').toString(),
      receiptNo: j['receiptNo']?.toString(),
      createdAt: DateTime.tryParse((j['createdAt'] ?? '').toString()) ?? DateTime.now(),
      method: PaymentMethodX.fromApi(
        (j['method'] ?? j['paymentMethod'] ?? firstPayment?['method'] ?? 'cash').toString(),
      ),
      subtotal: (j['subtotal'] as num?)?.toDouble() ?? 0,
      tax: (j['tax'] as num?)?.toDouble() ?? 0,
      total: (j['total'] as num?)?.toDouble() ?? 0,
      tendered: (j['tendered'] as num?)?.toDouble() ??
          (firstPayment?['tendered'] as num?)?.toDouble(),
      change: (j['change'] as num?)?.toDouble() ??
          (firstPayment?['change'] as num?)?.toDouble(),
      reference: j['reference']?.toString() ?? firstPayment?['reference']?.toString(),
      cashierId: j['cashierId']?.toString(),
      shiftId: (j['shiftId'] ?? j['shiftSessionId'])?.toString(),
      storeId: j['storeId']?.toString(),
      lines: linesRaw
          .whereType<Map>()
          .map((e) => SaleLine.fromJson(Map<String, dynamic>.from(e)))
          .toList(),
    );
  }
}

class PagedSales {
  final int page;
  final int limit;
  final int total;
  final int pages;
  final List<Sale> items;

  const PagedSales({
    required this.page,
    required this.limit,
    required this.total,
    required this.pages,
    required this.items,
  });
}