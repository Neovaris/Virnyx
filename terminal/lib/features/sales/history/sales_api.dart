import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/api_client.dart';
import '../../../core/api/api_provider.dart';
import '../../../core/offline/offline_db.dart';
import '../../../core/offline/offline_detector.dart';
import '../../../core/offline/offline_queue_models.dart';
import '../payment/payment_method.dart';
import '../../../core/logging/error_logger.dart';
import 'sales_models.dart';

final salesApiProvider = Provider((ref) => SalesApi(ref));

/// Provider to fetch refunds for a specific sale
/// Auto-refreshes every 3 seconds while sale details are displayed
final saleRefundsProvider = FutureProvider.family<List<RefundStatus>, String>((
  ref,
  saleId,
) async {
  final api = ref.read(salesApiProvider);
  return api.getSaleRefunds(saleId);
});

/// Auto-refresh provider for sale refunds - polls every 3 seconds
final saleRefundsAutoRefreshProvider =
    StreamProvider.family<List<RefundStatus>, String>((ref, saleId) async* {
      final api = ref.read(salesApiProvider);

      // Emit initial data
      try {
        final refunds = await api.getSaleRefunds(saleId);
        yield refunds;
      } catch (e) {
        yield [];
      }

      // Keep emitting updated refunds every 3 seconds
      while (true) {
        await Future.delayed(const Duration(seconds: 3));
        try {
          final refunds = await api.getSaleRefunds(saleId);
          yield refunds;
        } catch (e) {
          // Continue polling even on error
          continue;
        }
      }
    });

/// Provider to fetch a specific refund
final refundProvider = FutureProvider.family<RefundStatus?, String>((
  ref,
  refundId,
) async {
  final api = ref.read(salesApiProvider);
  return api.getRefund(refundId);
});

/// Auto-refresh provider for individual refund - polls every 2 seconds
final refundAutoRefreshProvider = StreamProvider.family<RefundStatus?, String>((
  ref,
  refundId,
) async* {
  final api = ref.read(salesApiProvider);

  // Emit initial data
  try {
    final refund = await api.getRefund(refundId);
    yield refund;
  } catch (e) {
    yield null;
  }

  // Keep emitting updated refund every 2 seconds
  while (true) {
    await Future.delayed(const Duration(seconds: 2));
    try {
      final refund = await api.getRefund(refundId);
      yield refund;
    } catch (e) {
      // Continue polling even on error
      continue;
    }
  }
});

class SalesApi {
  final Ref ref;
  final ApiClient _client;
  late final OfflineDb _db;

  SalesApi(this.ref) : _client = ref.read(apiProvider), _db = OfflineDb();

  Future<Sale> createSale({
    required PaymentMethod method,
    required List<SaleLine> lines,
    required double subtotal,
    required double tax,
    required double total,
    double discount = 0.0,
    double? tendered,
    double? change,
    String? reference,
    String? shiftId,
    String? storeId,
    String? cashierId,
    String? idempotencyKey,
  }) async {
    final isOnline = await ref
        .read(offlineDetectorProvider.notifier)
        .checkConnectivity();
    final tempId = idempotencyKey ?? generateTempSaleId();

    final body = {
      'subtotal': subtotal,
      'discount': discount,
      'tax': tax,
      'total': total,
      'shiftId': shiftId,
      'storeId': storeId,
      'cashierId': cashierId,
      'idempotencyKey': tempId,
      'items': lines
          .map(
            (l) => {
              'productId': l.productId,
              'qty': l.qty,
              'unitPrice': l.unitPrice,
              'name': l.name,
            },
          )
          .toList(),
      'payments': [
        {
          'method': method.name,
          'amount': total,
          if (tendered != null) 'tendered': tendered,
          if (change != null) 'change': change,
          if (reference != null && reference.isNotEmpty) 'reference': reference,
        },
      ],
    };

    if (!isOnline) {
      final queued = QueuedSale(
        id: tempId,
        tempId: tempId,
        payload: body,
        queuedAt: DateTime.now(),
      );
      await _db.queueSale(queued);

      ErrorLogger.logBusinessError('Sales', 'Queued sale offline: $tempId');

      return Sale(
        id: tempId,
        createdAt: DateTime.now(),
        method: method,
        subtotal: subtotal,
        tax: tax,
        total: total,
        lines: lines,
        tendered: tendered,
        change: change,
        reference: reference,
        shiftId: shiftId,
        storeId: storeId,
      );
    }

    try {
      return await createSaleRaw(body);
    } catch (e) {
      ErrorLogger.logBusinessError(
        'Sales',
        'Failed to create sale online, queuing for retry: $e',
      );

      final queued = QueuedSale(
        id: tempId,
        tempId: tempId,
        payload: body,
        queuedAt: DateTime.now(),
        syncError: e.toString(),
      );
      await _db.queueSale(queued);

      rethrow;
    }
  }

  Future<Sale> createSaleRaw(Map<String, dynamic> body) async {
    final res = await _client.postJson('/sales', body: body);

    if (res['sale'] is Map<String, dynamic>) {
      return Sale.fromJson(Map<String, dynamic>.from(res['sale']));
    }
    throw Exception('Unexpected sale response');
  }

  Future<PagedSales> listSales({int page = 1, int limit = 30}) async {
    final today = DateTime.now().toIso8601String().split('T').first;

    final res = await _client.getJson(
      '/reports/sales',
      query: {
        'date': today,
        'status': 'COMPLETED',
        'page': page.toString(),
        'limit': limit.toString(),
      },
    );

    if (res is Map<String, dynamic>) {
      final rawItems = res['items'];
      List<Map<String, dynamic>> items = [];

      if (rawItems is List) {
        items = (rawItems as List<dynamic>)
            .whereType<Map<String, dynamic>>()
            .map((e) => Map<String, dynamic>.from(e as Map))
            .toList();
      }

      return PagedSales(
        page: (res['page'] as num?)?.toInt() ?? page,
        limit: (res['limit'] as num?)?.toInt() ?? limit,
        total: (res['total'] as num?)?.toInt() ?? items.length,
        pages: (res['pages'] as num?)?.toInt() ?? 1,
        items: items.map((e) => Sale.fromJson(e)).toList(),
      );
    }

    if (res is List) {
      final items = (res as List<dynamic>)
          .whereType<Map<String, dynamic>>()
          .map((e) => Sale.fromJson(Map<String, dynamic>.from(e)))
          .toList();

      return PagedSales(
        page: 1,
        limit: items.length,
        total: items.length,
        pages: 1,
        items: items,
      );
    }

    throw Exception('Unexpected sales response');
  }

  Future<Sale> getSale(String id) async {
    final res = await _client.getJson('/sales/$id');

    if (res is Map<String, dynamic>) {
      final saleJson = res['sale'];
      if (saleJson is Map<String, dynamic>) {
        return Sale.fromJson(saleJson);
      }
    }

    throw Exception('Unexpected sale response');
  }

  /// Fetch refunds for a specific sale
  Future<List<RefundStatus>> getSaleRefunds(String saleId) async {
    try {
      final res = await _client.getJson('/sales/$saleId/refunds');

      if (res is Map<String, dynamic>) {
        final refunds = res['refunds'];
        if (refunds is List) {
          return refunds
              .whereType<Map<String, dynamic>>()
              .map((e) => RefundStatus.fromJson(Map<String, dynamic>.from(e)))
              .toList();
        }
      }

      return [];
    } catch (e) {
      ErrorLogger.logError('Failed to fetch refunds for sale $saleId: $e');
      return [];
    }
  }

  /// Fetch a specific refund by ID
  Future<RefundStatus?> getRefund(String refundId) async {
    try {
      final res = await _client.getJson('/refunds/$refundId');

      if (res is Map<String, dynamic>) {
        final refundJson = res['refund'];
        if (refundJson is Map<String, dynamic>) {
          return RefundStatus.fromJson(Map<String, dynamic>.from(refundJson));
        }
      }

      return null;
    } catch (e) {
      ErrorLogger.logError('Failed to fetch refund $refundId: $e');
      return null;
    }
  }

  /// Request a refund for a sale
  Future<RefundStatus> requestRefund({
    required String saleId,
    required double amount,
    required String reason,
  }) async {
    final body = {'saleId': saleId, 'amount': amount, 'reason': reason};

    try {
      final res = await _client.postJson('/refunds', body: body);

      if (res is Map<String, dynamic>) {
        final refundJson = res['refund'];
        if (refundJson is Map<String, dynamic>) {
          return RefundStatus.fromJson(Map<String, dynamic>.from(refundJson));
        }
      }

      throw Exception('Unexpected refund response');
    } catch (e) {
      ErrorLogger.logBusinessError(
        'Sales',
        'Failed to request refund for sale $saleId: $e',
        details: {'amount': amount, 'reason': reason},
      );
      rethrow;
    }
  }
}
