import 'package:flutter_riverpod/flutter_riverpod.dart';

final salesSearchProvider =
    NotifierProvider<SalesSearchController, String>(SalesSearchController.new);

class SalesSearchController extends Notifier<String> {
  @override
  String build() => '';

  void setQuery(String q) => state = q;
  void clear() => state = '';
}