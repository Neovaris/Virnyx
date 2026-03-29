import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'dart:convert';
import '../../../core/api/api_client.dart';
import '../../../core/api/api_provider.dart';
import '../../auth/providers/auth_provider.dart';
import '../../../core/api/api_config.dart';

// Response types
class DiscountRule {
  final String id;
  final String name;
  final String? code;
  final String? description;
  final String type; // FIXED, PERCENTAGE, BOGO, TIERED
  final double value;
  final double? minOrderAmount;
  final int? minItemQty;
  final double? maxDiscount;
  final bool applicableToAll;
  final List<String>? applicableProductIds;
  final DateTime? startsAt;
  final DateTime? endsAt;
  final bool isActive;
  final int? maxUsesTotal;
  final int? maxUsesPerCustomer;
  final int usageCount;

  DiscountRule({
    required this.id,
    required this.name,
    this.code,
    this.description,
    required this.type,
    required this.value,
    this.minOrderAmount,
    this.minItemQty,
    this.maxDiscount,
    this.applicableToAll = true,
    this.applicableProductIds,
    this.startsAt,
    this.endsAt,
    this.isActive = true,
    this.maxUsesTotal,
    this.maxUsesPerCustomer,
    this.usageCount = 0,
  });

  factory DiscountRule.fromJson(Map<String, dynamic> json) {
    return DiscountRule(
      id: json['id'] as String,
      name: json['name'] as String,
      code: json['code'] as String?,
      description: json['description'] as String?,
      type: json['type'] as String,
      value: (json['value'] as num).toDouble(),
      minOrderAmount: json['minOrderAmount'] != null
          ? (json['minOrderAmount'] as num).toDouble()
          : null,
      minItemQty: json['minItemQty'] as int?,
      maxDiscount: json['maxDiscount'] != null
          ? (json['maxDiscount'] as num).toDouble()
          : null,
      applicableToAll: json['applicableToAll'] as bool? ?? true,
      applicableProductIds: json['applicableProductIds'] != null
          ? List<String>.from(json['applicableProductIds'] as List)
          : null,
      startsAt: json['startsAt'] != null
          ? DateTime.parse(json['startsAt'] as String)
          : null,
      endsAt: json['endsAt'] != null
          ? DateTime.parse(json['endsAt'] as String)
          : null,
      isActive: json['isActive'] as bool? ?? true,
      maxUsesTotal: json['maxUsesTotal'] as int?,
      maxUsesPerCustomer: json['maxUsesPerCustomer'] as int?,
      usageCount: json['usageCount'] as int? ?? 0,
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'name': name,
    'code': code,
    'description': description,
    'type': type,
    'value': value,
    'minOrderAmount': minOrderAmount,
    'minItemQty': minItemQty,
    'maxDiscount': maxDiscount,
    'applicableToAll': applicableToAll,
    'applicableProductIds': applicableProductIds,
    'startsAt': startsAt?.toIso8601String(),
    'endsAt': endsAt?.toIso8601String(),
    'isActive': isActive,
    'maxUsesTotal': maxUsesTotal,
    'maxUsesPerCustomer': maxUsesPerCustomer,
    'usageCount': usageCount,
  };
}

class PromoCodeValidation {
  final bool valid;
  final DiscountRule? rule;
  final double discountAmount;
  final String? message;

  PromoCodeValidation({
    required this.valid,
    this.rule,
    required this.discountAmount,
    this.message,
  });

  factory PromoCodeValidation.fromJson(Map<String, dynamic> json) {
    return PromoCodeValidation(
      valid: json['valid'] as bool? ?? false,
      rule: json['rule'] != null
          ? DiscountRule.fromJson(json['rule'] as Map<String, dynamic>)
          : null,
      discountAmount: (json['discountAmount'] as num? ?? 0).toDouble(),
      message: json['message'] as String?,
    );
  }
}

class DiscountsApi {
  final ApiClient client;

  DiscountsApi({required this.client});

  // Validate promo code
  Future<PromoCodeValidation> validatePromoCode({
    required String code,
    required double subtotal,
  }) async {
    try {
      final response = await client.postJson(
        '/discounts/validate-code',
        body: {'code': code, 'subtotal': subtotal},
      );

      return PromoCodeValidation.fromJson(response);
    } catch (e) {
      return PromoCodeValidation(
        valid: false,
        discountAmount: 0,
        message: e.toString(),
      );
    }
  }

  // Apply promo code (track usage)
  Future<bool> applyPromoCode(String code) async {
    try {
      await client.postJson('/discounts/apply-code', body: {'code': code});
      return true;
    } catch (e) {
      return false;
    }
  }

  // Get all discount rules (for admin/management)
  Future<List<DiscountRule>> listRules({int page = 1, int limit = 20}) async {
    try {
      final response = await client.getJson(
        '/discounts/rules',
        query: {'page': page.toString(), 'limit': limit.toString()},
      );

      final data = response as Map<String, dynamic>;
      final rulesList = (data['data'] as List)
          .map((r) => DiscountRule.fromJson(r as Map<String, dynamic>))
          .toList();

      return rulesList;
    } catch (e) {
      return [];
    }
  }
}

final discountsApiProvider = Provider((ref) {
  final apiClient = ref.watch(apiProvider);
  return DiscountsApi(client: apiClient);
});
