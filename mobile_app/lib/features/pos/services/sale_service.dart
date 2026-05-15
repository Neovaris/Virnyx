import 'dart:math';

import '../../../shared/services/api_client.dart';

class SaleLineItem {
  const SaleLineItem({
    required this.productId,
    required this.qty,
    required this.price,
  });

  final String productId;
  final int qty;
  final double price;

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'productId': productId,
      'qty': qty,
      'price': price,
    };
  }
}

class SalePaymentInput {
  const SalePaymentInput({
    required this.method,
    required this.amount,
    this.reference,
  });

  final String method;
  final double amount;
  final String? reference;

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'method': method,
      'amount': amount,
      if (reference != null && reference!.trim().isNotEmpty)
        'reference': reference!.trim(),
    };
  }
}

class SaleResult {
  const SaleResult({
    required this.saleId,
    required this.receiptNo,
    required this.total,
    required this.change,
    required this.reused,
  });

  final String saleId;
  final String? receiptNo;
  final double total;
  final double change;
  final bool reused;

  factory SaleResult.fromResponse(Map<String, dynamic> response) {
    final Map<String, dynamic> sale =
        (response['sale'] as Map<String, dynamic>?) ?? <String, dynamic>{};

    return SaleResult(
      saleId: (sale['id'] ?? '').toString(),
      receiptNo: sale['receiptNo']?.toString(),
      total: (sale['total'] as num?)?.toDouble() ?? 0,
      change: (response['change'] as num?)?.toDouble() ?? 0,
      reused: response['reused'] == true,
    );
  }
}

class SaleService {
  SaleService._();

  static final SaleService instance = SaleService._();

  Future<SaleResult> createSale({
    required List<SaleLineItem> items,
    required List<SalePaymentInput> payments,
    double discount = 0,
    double tax = 0,
    String? discountPromoCode,
    String? clientTxnId,
  }) async {
    final Map<String, dynamic> body = <String, dynamic>{
      'items': items.map((SaleLineItem item) => item.toJson()).toList(),
      'payments': payments
          .map((SalePaymentInput payment) => payment.toJson())
          .toList(),
      if (discount > 0) 'discount': discount,
      if (tax > 0) 'tax': tax,
      if (discountPromoCode != null && discountPromoCode.trim().isNotEmpty)
        'discountPromoCode': discountPromoCode.trim().toUpperCase(),
      'clientTxnId': clientTxnId ?? _buildClientTxnId(),
    };

    final Map<String, dynamic> response = await ApiClient.instance.postJson(
      '/sales',
      body,
    );

    return SaleResult.fromResponse(response);
  }

  String _buildClientTxnId() {
    final int now = DateTime.now().microsecondsSinceEpoch;
    final int random = Random().nextInt(999999);
    return 'pos-$now-$random';
  }
}
