import 'package:flutter_riverpod/flutter_riverpod.dart';

final clearSearchSignalProvider =
    NotifierProvider<ClearSearchSignal, int>(ClearSearchSignal.new);

class ClearSearchSignal extends Notifier<int> {
  @override
  int build() => 0;

  void bump() => state++;
}