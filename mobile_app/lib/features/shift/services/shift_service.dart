import '../../../shared/services/api_client.dart';
import '../../auth/services/auth_service.dart';
import '../models/shift_session.dart';

class ShiftSummary {
  const ShiftSummary({
    required this.salesCount,
    required this.salesTotal,
    required this.refundsCount,
    required this.refundsAmount,
    required this.cashSales,
    required this.cashRefunds,
    required this.expectedCash,
  });

  final int salesCount;
  final double salesTotal;
  final int refundsCount;
  final double refundsAmount;
  final double cashSales;
  final double cashRefunds;
  final double expectedCash;

  factory ShiftSummary.fromApi(Map<String, dynamic> json) {
    final Map<String, dynamic> sales =
        (json['sales'] as Map<String, dynamic>?) ?? <String, dynamic>{};
    final Map<String, dynamic> refunds =
        (json['refunds'] as Map<String, dynamic>?) ?? <String, dynamic>{};
    final Map<String, dynamic> drawer =
        (json['drawer'] as Map<String, dynamic>?) ?? <String, dynamic>{};

    return ShiftSummary(
      salesCount: (sales['count'] as num?)?.toInt() ?? 0,
      salesTotal: (sales['total'] as num?)?.toDouble() ?? 0,
      refundsCount: (refunds['count'] as num?)?.toInt() ?? 0,
      refundsAmount: (refunds['amount'] as num?)?.toDouble() ?? 0,
      cashSales: (drawer['cashSales'] as num?)?.toDouble() ?? 0,
      cashRefunds: (drawer['cashRefunds'] as num?)?.toDouble() ?? 0,
      expectedCash: (drawer['expectedCash'] as num?)?.toDouble() ?? 0,
    );
  }
}

class ShiftCloseResult {
  const ShiftCloseResult({
    required this.expectedCash,
    required this.difference,
  });

  final double expectedCash;
  final double difference;

  factory ShiftCloseResult.fromApi(Map<String, dynamic> json) {
    final Map<String, dynamic> computed =
        (json['computed'] as Map<String, dynamic>?) ?? <String, dynamic>{};

    return ShiftCloseResult(
      expectedCash: (computed['expectedCash'] as num?)?.toDouble() ?? 0,
      difference: (computed['difference'] as num?)?.toDouble() ?? 0,
    );
  }
}

class ShiftService {
  ShiftService._();

  static final ShiftService instance = ShiftService._();

  Future<ShiftSession?> getActiveShift() async {
    final Map<String, dynamic> response = await ApiClient.instance.getJson(
      '/sessions/active',
    );
    final Map<String, dynamic>? sessionJson =
        response['session'] as Map<String, dynamic>?;

    if (sessionJson == null) {
      return null;
    }

    return ShiftSession.fromApi(sessionJson, cashierName: _cashierName);
  }

  Future<ShiftSession> openShift({
    required double openingCash,
    String? note,
  }) async {
    final Map<String, dynamic> body = <String, dynamic>{
      'openingCash': openingCash,
      if (note != null && note.trim().isNotEmpty) 'note': note.trim(),
    };

    final Map<String, dynamic> response = await ApiClient.instance.postJson(
      '/sessions/open',
      body,
    );
    final Map<String, dynamic>? sessionJson =
        response['session'] as Map<String, dynamic>?;

    if (sessionJson == null) {
      throw ApiException('Invalid open shift response');
    }

    return ShiftSession.fromApi(sessionJson, cashierName: _cashierName);
  }

  Future<ShiftSummary> getSummary(String shiftId) async {
    final Map<String, dynamic> response = await ApiClient.instance.getJson(
      '/sessions/$shiftId/summary',
    );
    return ShiftSummary.fromApi(response);
  }

  Future<ShiftCloseResult> closeShift({
    required String shiftId,
    required double closingCash,
    String? note,
  }) async {
    final Map<String, dynamic> body = <String, dynamic>{
      'closingCash': closingCash,
      if (note != null && note.trim().isNotEmpty) 'note': note.trim(),
    };

    final Map<String, dynamic> response = await ApiClient.instance.postJson(
      '/sessions/$shiftId/close',
      body,
    );

    return ShiftCloseResult.fromApi(response);
  }

  String get _cashierName {
    return AuthService.instance.currentSession?.displayName ?? 'Cashier';
  }
}
