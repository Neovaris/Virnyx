import 'dart:convert';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:http/http.dart' as http;

import '../../../core/api/api_config.dart';
import '../../auth/providers/auth_provider.dart';
import '../payment/payment_method.dart';
import 'sales_models.dart';

final salesApiProvider = Provider((ref) => SalesApi(ref));

class SalesApi {
  final Ref ref;
  SalesApi(this.ref);

  Map<String, String> _headers() {
    final auth = ref.read(authProvider);
    final token = auth.token;
    if (token == null || token.isEmpty) {
      throw Exception('Missing auth token');
    }
    return {
      'Authorization': 'Bearer $token',
      'Content-Type': 'application/json',
    };
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
  }) async {
    final uri = Uri.parse('${ApiConfig.baseUrl}/sales');

    final body = {
      'subtotal': subtotal,
      'discount': discount,
      'tax': tax,
      'total': total,
      'shiftId': shiftId,
      'storeId': storeId,
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
          'method': method.apiValue,
          'amount': total,
          'tendered': ?tendered,
          'change': ?change,
          if (reference != null && reference.isNotEmpty) 'reference': reference,
        },
      ],
    };

    final res = await http.post(
      uri,
      headers: _headers(),
      body: jsonEncode(body),
    );

    if (res.statusCode < 200 || res.statusCode >= 300) {
      throw Exception('Create sale failed: ${res.statusCode} ${res.body}');
    }

    final decoded = jsonDecode(res.body);
    if (decoded is Map<String, dynamic>) {
      final saleJson = decoded['sale'];
      if (saleJson is Map<String, dynamic>) {
        return Sale.fromJson(saleJson);
      }
    }
    throw Exception('Unexpected sale response');
  }

  Future<PagedSales> listSales({int page = 1, int limit = 30}) async {
    final today = DateTime.now().toIso8601String().split('T').first;
    final uri = Uri.parse(
      '${ApiConfig.baseUrl}/reports/sales?date=$today&status=COMPLETED&page=$page&limit=$limit',
    );

    final res = await http.get(uri, headers: _headers());

    print('LIST SALES STATUS: ${res.statusCode}');
    print('LIST SALES BODY: ${res.body}');

    if (res.statusCode < 200 || res.statusCode >= 300) {
      throw Exception('Sales fetch failed: ${res.statusCode} ${res.body}');
    }

    final decoded = jsonDecode(res.body);
    if (decoded is Map<String, dynamic>) {
      final rawItems = (decoded['items'] as List?) ?? const [];
      final items = rawItems
          .whereType<Map>()
          .map((e) => Sale.fromJson(Map<String, dynamic>.from(e)))
          .toList();

      return PagedSales(
        page: (decoded['page'] as num?)?.toInt() ?? page,
        limit: (decoded['limit'] as num?)?.toInt() ?? limit,
        total: (decoded['total'] as num?)?.toInt() ?? items.length,
        pages: (decoded['pages'] as num?)?.toInt() ?? 1,
        items: items,
      );
    }

    if (decoded is List) {
      final items = decoded
          .whereType<Map>()
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
    final uri = Uri.parse('$_baseUrl/sales/$id');
    final res = await http.get(uri, headers: _headers());

    print('GET SALE STATUS: ${res.statusCode}');
    print('GET SALE BODY: ${res.body}');

    if (res.statusCode < 200 || res.statusCode >= 300) {
      throw Exception('Sale fetch failed: ${res.statusCode} ${res.body}');
    }

    final decoded = jsonDecode(res.body);
    if (decoded is Map<String, dynamic>) {
      final saleJson = decoded['sale'];
      if (saleJson is Map<String, dynamic>) {
        return Sale.fromJson(saleJson);
      }
    }

    throw Exception('Unexpected sale response');
  }
}