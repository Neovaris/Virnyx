import 'dart:convert';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

final shiftProvider =
    NotifierProvider<ShiftController, ShiftState>(ShiftController.new);

class ShiftState {
  final bool initialized;
  final bool active;
  final String? shiftId;
  final double openingCash;
  final DateTime? openedAt;

  const ShiftState({
    required this.initialized,
    required this.active,
    required this.shiftId,
    required this.openingCash,
    required this.openedAt,
  });

  const ShiftState.closed({this.initialized = false})
      : active = false,
        shiftId = null,
        openingCash = 0,
        openedAt = null;

  bool get isOpen => active;

  ShiftState copyWith({
    bool? initialized,
    bool? active,
    String? shiftId,
    double? openingCash,
    DateTime? openedAt,
    bool clearShiftId = false,
    bool clearOpenedAt = false,
  }) {
    return ShiftState(
      initialized: initialized ?? this.initialized,
      active: active ?? this.active,
      shiftId: clearShiftId ? null : (shiftId ?? this.shiftId),
      openingCash: openingCash ?? this.openingCash,
      openedAt: clearOpenedAt ? null : (openedAt ?? this.openedAt),
    );
  }

  Map<String, dynamic> toJson() => {
        'active': active,
        'shiftId': shiftId,
        'openingCash': openingCash,
        'openedAt': openedAt?.toIso8601String(),
      };

  static ShiftState fromJson(Map<String, dynamic> j) => ShiftState(
        initialized: true,
        active: (j['active'] as bool?) ?? false,
        shiftId: j['shiftId'] as String?,
        openingCash: (j['openingCash'] as num?)?.toDouble() ?? 0,
        openedAt: j['openedAt'] == null
            ? null
            : DateTime.tryParse(j['openedAt'] as String),
      );
}

class ShiftController extends Notifier<ShiftState> {
  static const _key = 'vrx_active_shift';

  @override
  ShiftState build() {
    return const ShiftState.closed();
  }

  Future<void> initialize() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_key);

    if (raw == null) {
      state = const ShiftState.closed(initialized: true);
      return;
    }

    try {
      final j = jsonDecode(raw) as Map<String, dynamic>;
      state = ShiftState.fromJson(j);
    } catch (_) {
      state = const ShiftState.closed(initialized: true);
      await prefs.remove(_key);
    }
  }

  Future<void> setOpenedShift({
    required String shiftId,
    required double openingCash,
    DateTime? openedAt,
  }) async {
    final prefs = await SharedPreferences.getInstance();

    final newState = ShiftState(
      initialized: true,
      active: true,
      shiftId: shiftId,
      openingCash: openingCash,
      openedAt: openedAt ?? DateTime.now(),
    );

    state = newState;
    await prefs.setString(_key, jsonEncode(newState.toJson()));
  }

  Future<void> closeShift() async {
    final prefs = await SharedPreferences.getInstance();
    state = const ShiftState.closed(initialized: true);
    await prefs.remove(_key);
  }
}