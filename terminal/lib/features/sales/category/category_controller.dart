import 'package:flutter_riverpod/flutter_riverpod.dart';

final selectedCategoryProvider =
    NotifierProvider<SelectedCategoryController, String>(
        SelectedCategoryController.new);

class SelectedCategoryController extends Notifier<String> {
  @override
  String build() => 'All';

  void set(String category) => state = category;
}