import 'package:flutter_riverpod/flutter_riverpod.dart';

class ScanEvent {
  final int id;
  final String value;
  const ScanEvent({required this.id, required this.value});
}

final scanEventProvider =
    NotifierProvider<ScanEventController, ScanEvent?>(ScanEventController.new);

class ScanEventController extends Notifier<ScanEvent?> {
  int _seq = 0;

  @override
  ScanEvent? build() => null;

  void submit(String value) {
    final v = value.trim();
    if (v.isEmpty) return;
    _seq++;
    state = ScanEvent(id: _seq, value: v);
  }

  void clear() {
    state = null;
  }
}