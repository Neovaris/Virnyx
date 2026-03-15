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

class SalesApi {
  final Ref ref;
  late final ApiClient _client;
  late final OfflineDb _db;

  SalesApi(this.ref) {
    _client = ref.read(apiProvider);
    _db = OfflineDb();
  }

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

      ErrorLogger.logBusinessError(
        'Sales',
        'Queued sale offline: $tempId',
      );

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
    final res = await _client.postJson(
      '/sales',
      body: body,
    );

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
}