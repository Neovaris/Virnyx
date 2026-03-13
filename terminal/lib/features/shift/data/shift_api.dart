import 'dart:convert';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/api_client.dart';
import '../../../core/api/api_provider.dart';
import '../../auth/providers/auth_provider.dart';

final shiftApiProvider = Provider<ShiftApi>((ref) => ShiftApi(ref));

class OpenedShift {
  final String id;
  final double openingCash;
  final DateTime? openedAt;

  const OpenedShift({
    required this.id,
    required this.openingCash,
    required this.openedAt,
  });

  factory OpenedShift.fromJson(Map<String, dynamic> j) {
    return OpenedShift(
      id: (j['id'] ?? '').toString(),
      openingCash: (j['openingCash'] as num?)?.toDouble() ?? 0,
      openedAt: j['openedAt'] == null
          ? null
          : DateTime.tryParse(j['openedAt'].toString()),
    );
  }
}

class ShiftCloseSummary {
  final Map<String, dynamic> sales;
  final Map<String, dynamic> payments;

  const ShiftCloseSummary({
    required this.sales,
    required this.payments,
  });

  int get completedCount => (sales['completedCount'] as int?) ?? 0;
  int get voidedCount => (sales['voidedCount'] as int?) ?? 0;
  double get grossTotal => ((sales['grossTotal'] as num?) ?? 0).toDouble();
  double get refunds => ((sales['refunds'] as num?) ?? 0).toDouble();
  double get netTotal => ((sales['netTotal'] as num?) ?? 0).toDouble();
}

class ShiftApi {
  final Ref ref;
  late final ApiClient _client;

  ShiftApi(this.ref) {
    _client = ref.read(apiProvider);
  }

  Future<OpenedShift> openShift({required double openingCash}) async {
    final body = {
      'openingCash': openingCash,
    };

    final res = await _client.postJson(
      '/sessions/open',
      body: body,
    );

    final sessionJson = res['session'] ?? res;
    if (sessionJson is Map<String, dynamic>) {
      return OpenedShift.fromJson(sessionJson);
    }

    throw Exception('Unexpected open shift response');
  }

  Future<OpenedShift?> getActiveShift() async {
    final res = await _client.getJson('/sessions/active');

    if (res is Map<String, dynamic>) {
      final sessionJson = res['session'];
      if (sessionJson == null) return null;

      if (sessionJson is Map<String, dynamic>) {
        return OpenedShift.fromJson(sessionJson);
      }
    }

    throw Exception('Unexpected active shift response');
  }

  Future<ShiftCloseSummary> getShiftSummary(String date) async {
    final res = await _client.getJson(
      '/reports/daily',
      query: {'date': date},
    );

    final sales = Map<String, dynamic>.from(res['sales'] as Map? ?? {});
    final payments = Map<String, dynamic>.from(res['payments'] as Map? ?? {});

    return ShiftCloseSummary(sales: sales, payments: payments);
  }

  Future<void> closeShift({
    required String sessionId,
    required double closingCash,
    String? note,
  }) async {
    final body = {
      'closingCash': closingCash,
      if (note != null && note.trim().isNotEmpty) 'note': note.trim(),
    };

    await _client.postJson(
      '/sessions/$sessionId/close',
      body: body,
    );
  }
}