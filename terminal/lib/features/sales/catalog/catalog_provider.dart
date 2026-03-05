// lib/features/sales/catalog/catalog_provider.dart
import 'dart:convert';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:http/http.dart' as http;

import '../../auth/auth_provider.dart';
import 'catalog_models.dart';

final catalogProvider =
    NotifierProvider<CatalogController, CatalogState>(CatalogController.new);

class CatalogController extends Notifier<CatalogState> {
  static const _baseUrl = 'http://localhost:4000';

  @override
  CatalogState build() {
    // return initial state immediately, then load async
    Future.microtask(_loadInitial);
    return const CatalogState.initial();
  }

  Future<void> _loadInitial() async {
    // If provider rebuilds, avoid looping
    if (state.loading) return;

    state = state.copyWith(loading: true, error: null);

    try {
      final auth = ref.read(authProvider);
      final token = auth.token;

      if (token == null || token.isEmpty) {
        state = state.copyWith(
          loading: false,
          error: 'Not logged in (missing token)',
          items: const [],
        );
        return;
      }

      final uri = Uri.parse('$_baseUrl/products?limit=100&page=1');

      final res = await http.get(
        uri,
        headers: {
          'Authorization': 'Bearer $token',
          'Content-Type': 'application/json',
        },
      );

      if (res.statusCode < 200 || res.statusCode >= 300) {
        state = state.copyWith(
          loading: false,
          error: 'Products fetch failed: ${res.statusCode} ${res.body}',
        );
        return;
      }

      final decoded = jsonDecode(res.body) as Map<String, dynamic>;
      final rawItems = (decoded['items'] as List?) ?? const [];

      final items = rawItems.map((e) {
        final m = Map<String, dynamic>.from(e as Map);
        return CatalogProduct.fromJson(m);
      }).toList();

      state = state.copyWith(loading: false, error: null, items: items);
    } catch (e) {
      state = state.copyWith(loading: false, error: 'Catalog error: $e');
    }
  }

  Future<void> refresh() => _loadInitial();
}