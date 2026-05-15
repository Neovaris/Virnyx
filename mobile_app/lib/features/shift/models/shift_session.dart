class ShiftSession {
  const ShiftSession({
    required this.id,
    required this.cashierId,
    required this.merchantId,
    required this.storeId,
    required this.cashierName,
    required this.openedAt,
    required this.openingAmount,
    required this.status,
    this.note,
  });

  final String id;
  final String cashierId;
  final String merchantId;
  final String storeId;
  final String cashierName;
  final DateTime openedAt;
  final double openingAmount;
  final String status;
  final String? note;

  factory ShiftSession.fromApi(
    Map<String, dynamic> json, {
    required String cashierName,
  }) {
    return ShiftSession(
      id: (json['id'] ?? '').toString(),
      cashierId: (json['cashierId'] ?? '').toString(),
      merchantId: (json['merchantId'] ?? '').toString(),
      storeId: (json['storeId'] ?? '').toString(),
      cashierName: cashierName,
      openedAt:
          DateTime.tryParse((json['openedAt'] ?? '').toString()) ??
          DateTime.now(),
      openingAmount: (json['openingCash'] as num?)?.toDouble() ?? 0,
      status: (json['status'] ?? 'OPEN').toString(),
      note: json['note']?.toString(),
    );
  }
}
