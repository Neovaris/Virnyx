import 'dart:convert';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:http/http.dart' as http;

import '../../auth/auth_provider.dart';
import '../payment/payment_method.dart';
import 'sales_models.dart';

final salesApiProvider = Provider((ref) => SalesApi(ref));

class SalesApi {
  static const _baseUrl = 'http://localhost:4000';
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
    double? tendered,
    double? change,
    String? reference,
    String? shiftId,
    String? storeId,
  }) async {
    final uri = Uri.parse('$_baseUrl/sales');

    final body = {
      'paymentMethod': method.apiValue,
      'subtotal': subtotal,
      'tax': tax,
      'total': total,
      'tendered': tendered,
      'change': change,
      'reference': reference,
      'shiftId': shiftId,
      'storeId': storeId,
      'items': lines
          .map((l) => {
                'productId': l.productId,
                'name': l.name, // harmless if backend ignores
                'unitPrice': l.unitPrice, // harmless if backend ignores
                'qty': l.qty,
              })
          .toList(),
    };

    final res = await http.post(uri, headers: _headers(), body: jsonEncode(body));

    if (res.statusCode < 200 || res.statusCode >= 300) {
      throw Exception('Create sale failed: ${res.statusCode} ${res.body}');
    }

    final decoded = jsonDecode(res.body);
    if (decoded is Map<String, dynamic>) {
      return Sale.fromJson(decoded);
    }
    throw Exception('Unexpected sale response');
  }

  Future<PagedSales> listSales({int page = 1, int limit = 30}) async {
    final uri = Uri.parse('$_baseUrl/sales?page=$page&limit=$limit');
    final res = await http.get(uri, headers: _headers());

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

    // If backend returns array directly, still handle it:
    if (decoded is List) {
      final items = decoded
          .whereType<Map>()
          .map((e) => Sale.fromJson(Map<String, dynamic>.from(e)))
          .toList();
      return PagedSales(page: 1, limit: items.length, total: items.length, pages: 1, items: items);
    }

    throw Exception('Unexpected sales response');
  }

  Future<Sale> getSale(String id) async {
    final uri = Uri.parse('$_baseUrl/sales/$id');
    final res = await http.get(uri, headers: _headers());

    if (res.statusCode < 200 || res.statusCode >= 300) {
      throw Exception('Sale fetch failed: ${res.statusCode} ${res.body}');
    }

    final decoded = jsonDecode(res.body);
    if (decoded is Map<String, dynamic>) {
      return Sale.fromJson(decoded);
    }
    throw Exception('Unexpected sale response');
  }
}