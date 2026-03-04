import 'dart:convert';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

final shiftProvider = NotifierProvider<ShiftController, ShiftState>(ShiftController.new);

class ShiftState {
  final bool active;
  final String? shiftId;
  final double openingCash;
  final DateTime? openedAt;

  const ShiftState({
    required this.active,
    required this.shiftId,
    required this.openingCash,
    required this.openedAt,
  });

  const ShiftState.closed() : active = false, shiftId = null, openingCash = 0, openedAt = null;

  Map<String, dynamic> toJson() => {
        'active': active,
        'shiftId': shiftId,
        'openingCash': openingCash,
        'openedAt': openedAt?.toIso8601String(),
      };

  static ShiftState fromJson(Map<String, dynamic> j) => ShiftState(
        active: (j['active'] as bool?) ?? false,
        shiftId: j['shiftId'] as String?,
        openingCash: (j['openingCash'] as num?)?.toDouble() ?? 0,
        openedAt: j['openedAt'] == null ? null : DateTime.tryParse(j['openedAt'] as String),
      );
}

class ShiftController extends Notifier<ShiftState> {
  static const _key = 'vrx_active_shift';

  @override
  ShiftState build() {
    _load();
    return const ShiftState.closed();
  }

  Future<void> _load() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_key);
    if (raw == null) return;
    final j = jsonDecode(raw) as Map<String, dynamic>;
    state = ShiftState.fromJson(j);
  }

  Future<void> openShift({required double openingCash}) async {
    final prefs = await SharedPreferences.getInstance();
    final newState = ShiftState(
      active: true,
      shiftId: 'shift_${DateTime.now().millisecondsSinceEpoch}', // v0.1 local id
      openingCash: openingCash,
      openedAt: DateTime.now(),
    );
    state = newState;
    await prefs.setString(_key, jsonEncode(newState.toJson()));
  }

  Future<void> closeShift() async {
    final prefs = await SharedPreferences.getInstance();
    state = const ShiftState.closed();
    await prefs.remove(_key);
  }
}