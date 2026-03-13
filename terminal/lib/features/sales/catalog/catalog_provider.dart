// lib/features/sales/catalog/catalog_provider.dart
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/api_client.dart';
import '../../../core/api/api_provider.dart';
import '../../auth/providers/auth_provider.dart';
import 'catalog_models.dart';

final catalogProvider =
    NotifierProvider<CatalogController, CatalogState>(CatalogController.new);

class CatalogController extends Notifier<CatalogState> {
  late final ApiClient _client;

  @override
  CatalogState build() {
    _client = ref.read(apiProvider);
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
      if (!auth.loggedIn) {
        state = state.copyWith(
          loading: false,
          error: 'Not logged in',
          items: const [],
        );
        return;
      }

      final res = await _client.getJson(
        '/products',
        query: {'limit': '100', 'page': '1'},
      );

      final rawItems = (res['items'] as List?) ?? const [];

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