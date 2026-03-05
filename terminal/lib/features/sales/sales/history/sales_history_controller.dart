import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'sales_api.dart';
import 'sales_models.dart';

final salesHistoryProvider =
    AutoDisposeAsyncNotifierProvider<SalesHistoryController, PagedSales>(
        SalesHistoryController.new);

class SalesHistoryController extends AutoDisposeAsyncNotifier<PagedSales> {
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
    final current = state.valueOrNull;
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

final saleDetailsProvider =
    AutoDisposeFamilyAsyncNotifierProvider<SaleDetailsController, Sale, String>(
        SaleDetailsController.new);

class SaleDetailsController
    extends AutoDisposeFamilyAsyncNotifier<Sale, String> {
  @override
  Future<Sale> build(String saleId) {
    return ref.read(salesApiProvider).getSale(saleId);
  }
}