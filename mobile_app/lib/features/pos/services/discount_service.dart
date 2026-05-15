import '../../../shared/services/api_client.dart';

class DiscountValidationResult {
  const DiscountValidationResult({
    required this.discountAmount,
    required this.code,
    required this.type,
    this.maxDiscount,
    this.minOrderAmount,
  });

  final double discountAmount;
  final String code;
  final String type;
  final double? maxDiscount;
  final double? minOrderAmount;

  factory DiscountValidationResult.fromResponse(Map<String, dynamic> response) {
    return DiscountValidationResult(
      discountAmount:
          double.tryParse(response['discountAmount'].toString()) ?? 0,
      code: response['code'] ?? '',
      type: response['type'] ?? 'PERCENTAGE',
      maxDiscount: response['maxDiscount'] != null
          ? double.tryParse(response['maxDiscount'].toString())
          : null,
      minOrderAmount: response['minOrderAmount'] != null
          ? double.tryParse(response['minOrderAmount'].toString())
          : null,
    );
  }
}

class DiscountService {
  DiscountService._();

  static final DiscountService instance = DiscountService._();

  /// Validate a promo code and get the discount amount from backend
  ///
  /// Parameters:
  /// - [code]: The promo code (will be uppercase-normalized)
  /// - [subtotal]: The cart subtotal before discount
  ///
  /// Returns: DiscountValidationResult with calculated discount amount
  /// Throws: ApiException if code is invalid/expired/reached usage limit
  Future<DiscountValidationResult> validatePromoCode({
    required String code,
    required double subtotal,
  }) async {
    if (code.trim().isEmpty) {
      throw Exception('Promo code cannot be empty');
    }

    if (subtotal <= 0) {
      throw Exception('Subtotal must be greater than 0');
    }

    final Map<String, dynamic> body = <String, dynamic>{
      'code': code.trim().toUpperCase(),
      'subtotal': subtotal,
    };

    final Map<String, dynamic> response = await ApiClient.instance.postJson(
      '/discounts/validate-code',
      body,
    );

    return DiscountValidationResult.fromResponse(response);
  }
}
