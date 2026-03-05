import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'sale_models.dart';

final salesHistoryProvider =
    NotifierProvider<SalesHistoryController, List<CompletedSale>>(
        SalesHistoryController.new);

class SalesHistoryController extends Notifier<List<CompletedSale>> {
  int _seq = 0;

  @override
  List<CompletedSale> build() => const [];

  String nextSaleId() {
    _seq++;
    return 'S-${_seq.toString().padLeft(6, '0')}';
  }

  void add(CompletedSale sale) {
    state = [sale, ...state]; // newest first
  }

  void clearAll() => state = const [];
}