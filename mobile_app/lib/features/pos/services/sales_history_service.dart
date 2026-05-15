import '../../../shared/services/api_client.dart';
import '../../auth/services/auth_service.dart';

class SalesHistoryItem {
  const SalesHistoryItem({
    required this.id,
    required this.receiptNo,
    required this.cashierId,
    required this.status,
    required this.subtotal,
    required this.discount,
    required this.tax,
    required this.total,
    required this.createdAt,
  });

  final String id;
  final String? receiptNo;
  final String? cashierId;
  final String status;
  final double subtotal;
  final double discount;
  final double tax;
  final double total;
  final DateTime createdAt;

  factory SalesHistoryItem.fromJson(Map<String, dynamic> json) {
    return SalesHistoryItem(
      id: (json['id'] ?? '').toString(),
      receiptNo: json['receiptNo']?.toString(),
      cashierId: json['cashierId']?.toString(),
      status: (json['status'] ?? 'COMPLETED').toString(),
      subtotal: (json['subtotal'] as num?)?.toDouble() ?? 0,
      discount: (json['discount'] as num?)?.toDouble() ?? 0,
      tax: (json['tax'] as num?)?.toDouble() ?? 0,
      total: (json['total'] as num?)?.toDouble() ?? 0,
      createdAt:
          DateTime.tryParse((json['createdAt'] ?? '').toString()) ??
          DateTime.now(),
    );
  }
}

class SaleDetailItem {
  const SaleDetailItem({
    required this.id,
    required this.productId,
    required this.name,
    required this.price,
    required this.qty,
    required this.lineTotal,
  });

  final String id;
  final String productId;
  final String name;
  final double price;
  final int qty;
  final double lineTotal;

  factory SaleDetailItem.fromJson(Map<String, dynamic> json) {
    return SaleDetailItem(
      id: (json['id'] ?? '').toString(),
      productId: (json['productId'] ?? '').toString(),
      name: (json['nameSnap'] ?? json['name'] ?? '').toString(),
      price: (json['priceSnap'] as num?)?.toDouble() ?? 0,
      qty: (json['qty'] as num?)?.toInt() ?? 0,
      lineTotal: (json['lineTotal'] as num?)?.toDouble() ?? 0,
    );
  }
}

class SalePayment {
  const SalePayment({
    required this.method,
    required this.amount,
    required this.reference,
  });

  final String method;
  final double amount;
  final String? reference;

  factory SalePayment.fromJson(Map<String, dynamic> json) {
    return SalePayment(
      method: (json['method'] ?? '').toString().toUpperCase(),
      amount: (json['amount'] as num?)?.toDouble() ?? 0,
      reference: json['reference']?.toString(),
    );
  }
}

class SaleDetail {
  const SaleDetail({
    required this.id,
    required this.receiptNo,
    required this.status,
    required this.subtotal,
    required this.discount,
    required this.tax,
    required this.total,
    required this.createdAt,
    required this.items,
    required this.payments,
  });

  final String id;
  final String? receiptNo;
  final String status;
  final double subtotal;
  final double discount;
  final double tax;
  final double total;
  final DateTime createdAt;
  final List<SaleDetailItem> items;
  final List<SalePayment> payments;

  factory SaleDetail.fromJson(Map<String, dynamic> json) {
    final List<dynamic> rawItems =
        (json['items'] as List<dynamic>?) ?? <dynamic>[];
    final List<dynamic> rawPayments =
        (json['payments'] as List<dynamic>?) ?? <dynamic>[];

    return SaleDetail(
      id: (json['id'] ?? '').toString(),
      receiptNo: json['receiptNo']?.toString(),
      status: (json['status'] ?? 'COMPLETED').toString(),
      subtotal: (json['subtotal'] as num?)?.toDouble() ?? 0,
      discount: (json['discount'] as num?)?.toDouble() ?? 0,
      tax: (json['tax'] as num?)?.toDouble() ?? 0,
      total: (json['total'] as num?)?.toDouble() ?? 0,
      createdAt:
          DateTime.tryParse((json['createdAt'] ?? '').toString()) ??
          DateTime.now(),
      items: rawItems
          .whereType<Map>()
          .map(
            (Map item) =>
                SaleDetailItem.fromJson(Map<String, dynamic>.from(item)),
          )
          .toList(),
      payments: rawPayments
          .whereType<Map>()
          .map(
            (Map item) => SalePayment.fromJson(Map<String, dynamic>.from(item)),
          )
          .toList(),
    );
  }
}

class RefundStatusItem {
  const RefundStatusItem({
    required this.id,
    required this.approvalStatus,
    required this.amount,
    required this.reason,
    required this.rejectionReason,
    required this.createdAt,
  });

  final String id;
  final String approvalStatus;
  final double amount;
  final String? reason;
  final String? rejectionReason;
  final DateTime createdAt;

  factory RefundStatusItem.fromJson(Map<String, dynamic> json) {
    return RefundStatusItem(
      id: (json['id'] ?? '').toString(),
      approvalStatus: (json['approvalStatus'] ?? 'PENDING_APPROVAL').toString(),
      amount: (json['amount'] as num?)?.toDouble() ?? 0,
      reason: json['reason']?.toString(),
      rejectionReason: json['rejectionReason']?.toString(),
      createdAt:
          DateTime.tryParse((json['createdAt'] ?? '').toString()) ??
          DateTime.now(),
    );
  }
}

class SalesHistoryPage {
  const SalesHistoryPage({
    required this.page,
    required this.limit,
    required this.total,
    required this.pages,
    required this.items,
  });

  final int page;
  final int limit;
  final int total;
  final int pages;
  final List<SalesHistoryItem> items;
}

class SalesHistoryService {
  SalesHistoryService._();

  static final SalesHistoryService instance = SalesHistoryService._();

  Future<String?> _resolveCashierId() async {
    final String? cachedId = AuthService.instance.currentSession?.userId;
    if (cachedId != null && cachedId.isNotEmpty) {
      return cachedId;
    }

    // Recover persisted auth session if memory state was lost.
    try {
      final session = await AuthService.instance.restoreSession();
      final String restoredId = (session?.userId ?? '').trim();
      if (restoredId.isNotEmpty) {
        return restoredId;
      }
    } catch (_) {
      // Continue with /auth/me fallback.
    }

    try {
      final Map<String, dynamic> me = await ApiClient.instance.getJson(
        '/auth/me',
      );

      // backend shape: { user: { id, ... }, roles, permissions }
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
      // If this fails, caller handles auth/session error.
    }

    return null;
  }

  Future<SalesHistoryPage> listCashierSales({
    String? cashierId,
    int page = 1,
    int limit = 20,
    String? date,
  }) async {
    final String? resolvedCashierId =
        (cashierId != null && cashierId.isNotEmpty)
        ? cashierId
        : await _resolveCashierId();

    if (resolvedCashierId == null || resolvedCashierId.isEmpty) {
      throw ApiException(
        'Unable to resolve cashier identity. Please login again.',
      );
    }

    final String day =
        date ?? DateTime.now().toIso8601String().split('T').first;
    final String cashierQuery = '&cashierId=$resolvedCashierId';

    final Map<String, dynamic> response = await ApiClient.instance.getJson(
      '/reports/sales?date=$day&status=COMPLETED&page=$page&limit=$limit$cashierQuery',
    );

    final List<dynamic> rawItems =
        (response['items'] as List<dynamic>?) ?? <dynamic>[];

    final List<SalesHistoryItem> parsedItems = rawItems
        .whereType<Map>()
        .map(
          (Map item) =>
              SalesHistoryItem.fromJson(Map<String, dynamic>.from(item)),
        )
        .where((SalesHistoryItem item) => item.cashierId == resolvedCashierId)
        .toList();

    return SalesHistoryPage(
      page: (response['page'] as num?)?.toInt() ?? page,
      limit: (response['limit'] as num?)?.toInt() ?? limit,
      total: parsedItems.length,
      pages: (response['pages'] as num?)?.toInt() ?? 1,
      items: parsedItems,
    );
  }

  Future<SaleDetail> getSaleDetail(String saleId) async {
    final Map<String, dynamic> response = await ApiClient.instance.getJson(
      '/sales/$saleId',
    );
    final Map<String, dynamic>? sale = response['sale'] is Map<String, dynamic>
        ? response['sale'] as Map<String, dynamic>
        : null;
    if (sale == null) {
      throw ApiException('Sale details not found in response');
    }
    return SaleDetail.fromJson(sale);
  }

  Future<List<RefundStatusItem>> getSaleRefunds(String saleId) async {
    final Map<String, dynamic> response = await ApiClient.instance.getJson(
      '/sales/$saleId/refunds',
    );
    final List<dynamic> raw =
        (response['refunds'] as List<dynamic>?) ?? <dynamic>[];
    return raw
        .whereType<Map>()
        .map(
          (Map item) =>
              RefundStatusItem.fromJson(Map<String, dynamic>.from(item)),
        )
        .toList();
  }

  Future<RefundStatusItem> requestRefund({
    required String saleId,
    required double amount,
    required String reason,
  }) async {
    final Map<String, dynamic> response = await ApiClient.instance.postJson(
      '/refunds',
      <String, dynamic>{
        'saleId': saleId,
        'amount': amount,
        'reason': reason.trim(),
      },
    );

    final Map<String, dynamic>? refund =
        response['refund'] is Map<String, dynamic>
        ? response['refund'] as Map<String, dynamic>
        : null;

    if (refund == null) {
      throw ApiException('Refund response missing payload');
    }

    return RefundStatusItem.fromJson(refund);
  }

  String requireCashierId() {
    final String? cashierId = AuthService.instance.currentSession?.userId;
    if (cashierId == null || cashierId.isEmpty) {
      throw ApiException('No cashier session found. Please login again.');
    }
    return cashierId;
  }
}
