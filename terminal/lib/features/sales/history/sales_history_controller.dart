import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'sales_api.dart';
import 'sales_models.dart';

final salesHistoryProvider =
    AsyncNotifierProvider<SalesHistoryController, PagedSales>(
  SalesHistoryController.new,
);

class SalesHistoryController extends AsyncNotifier<PagedSales> {
  int _page = 1;
  final int _limit = 30;

  @override
  Future<PagedSales> build() async {
    return ref.read(salesApiProvider).listSales(page: _page, limit: _limit);
  }

  Future<void> refresh() async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(
      () => ref.read(salesApiProvider).listSales(page: _page, limit: _limit),
    );
  }

  Future<void> nextPage() async {
    final current = state.asData?.value;
    if (current == null) return;
    if (_page >= current.pages) return;

    _page += 1;
    await refresh();
  }

  Future<void> prevPage() async {
    if (_page <= 1) return;
    _page -= 1;
    await refresh();
  }
}

final saleDetailsProvider = FutureProvider.family<Sale, String>((ref, saleId) {
  return ref.read(salesApiProvider).getSale(saleId);
});