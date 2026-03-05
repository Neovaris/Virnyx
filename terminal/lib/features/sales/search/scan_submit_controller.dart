import 'package:flutter_riverpod/flutter_riverpod.dart';

final scanSubmitProvider =
    NotifierProvider<ScanSubmitController, int>(ScanSubmitController.new);

class ScanSubmitController extends Notifier<int> {
  @override
  int build() => 0;

  void bump() => state++;
}