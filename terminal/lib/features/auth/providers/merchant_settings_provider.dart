// lib/features/auth/providers/merchant_settings_provider.dart
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/api/api_client.dart';
import '../../../core/api/api_config.dart';
import '../models/merchant_settings.dart';
import 'auth_provider.dart';

final merchantSettingsProvider =
    NotifierProvider<MerchantSettingsNotifier, MerchantSettings>(
      MerchantSettingsNotifier.new,
    );

class MerchantSettingsNotifier extends Notifier<MerchantSettings> {
  @override
  MerchantSettings build() {
    // Initialize with defaults - settings will be loaded on login
    return MerchantSettings.default_();
  }

  /// Load all merchant settings from backend
  Future<void> loadSettings() async {
    try {
      final auth = ref.read(authProvider);
      final token = auth.token ?? '';

      if (token.isEmpty) {
        state = MerchantSettings.default_();
        return;
      }

      final client = ApiClient(baseUrl: ApiConfig.baseUrl, token: token);

      // Fetch all settings in parallel
      final responses = await Future.wait([
        client.getJson('/settings/merchant').catchError((_) => {}),
        client.getJson('/settings/store').catchError((_) => {}),
        client.getJson('/settings/tax').catchError((_) => {}),
        client.getJson('/settings/payment-methods').catchError((_) => {}),
        client.getJson('/settings/sales').catchError((_) => {}),
        client.getJson('/settings/refund-policy').catchError((_) => {}),
      ]);

      // Combine all responses into a single map
      final allSettings = {
        'merchant': responses[0],
        'store': responses[1],
        'tax': responses[2],
        'paymentMethods': responses[3],
        'sales': responses[4],
        'refundPolicy': responses[5],
      };

      state = MerchantSettings.fromJson(allSettings);
    } catch (e) {
      // Keep previous state or use defaults on error
      print('Failed to load settings: $e');
    }
  }

  void setSettings(MerchantSettings settings) {
    state = settings;
  }

  void updateTaxRate(double rate) {
    state = MerchantSettings(
      taxEnabled: state.taxEnabled,
      taxRate: rate,
      pricesIncludeTax: state.pricesIncludeTax,
      enableCash: state.enableCash,
      enableCard: state.enableCard,
      enableMobileMoney: state.enableMobileMoney,
      enableCheck: state.enableCheck,
      enableBankTransfer: state.enableBankTransfer,
      cardSurchargePercent: state.cardSurchargePercent,
      mobileMoneysSurchargePercent: state.mobileMoneysSurchargePercent,
      allowNegativeStock: state.allowNegativeStock,
      warnLowStock: state.warnLowStock,
      maxDiscountPercent: state.maxDiscountPercent,
      enableManualDiscount: state.enableManualDiscount,
      enableVolumeDiscount: state.enableVolumeDiscount,
      enableLoyaltyDiscount: state.enableLoyaltyDiscount,
      maxTransactionAmount: state.maxTransactionAmount,
      minTransactionAmount: state.minTransactionAmount,
      refundWindowDays: state.refundWindowDays,
      autoRestockItems: state.autoRestockItems,
      maxRefundPercentage: state.maxRefundPercentage,
      minRefundAmount: state.minRefundAmount,
      lowStockThreshold: state.lowStockThreshold,
      currency: state.currency,
    );
  }

  void enableTax(bool enabled) {
    state = MerchantSettings(
      taxEnabled: enabled,
      taxRate: state.taxRate,
      pricesIncludeTax: state.pricesIncludeTax,
      enableCash: state.enableCash,
      enableCard: state.enableCard,
      enableMobileMoney: state.enableMobileMoney,
      enableCheck: state.enableCheck,
      enableBankTransfer: state.enableBankTransfer,
      cardSurchargePercent: state.cardSurchargePercent,
      mobileMoneysSurchargePercent: state.mobileMoneysSurchargePercent,
      allowNegativeStock: state.allowNegativeStock,
      warnLowStock: state.warnLowStock,
      maxDiscountPercent: state.maxDiscountPercent,
      enableManualDiscount: state.enableManualDiscount,
      enableVolumeDiscount: state.enableVolumeDiscount,
      enableLoyaltyDiscount: state.enableLoyaltyDiscount,
      maxTransactionAmount: state.maxTransactionAmount,
      minTransactionAmount: state.minTransactionAmount,
      refundWindowDays: state.refundWindowDays,
      autoRestockItems: state.autoRestockItems,
      maxRefundPercentage: state.maxRefundPercentage,
      minRefundAmount: state.minRefundAmount,
      lowStockThreshold: state.lowStockThreshold,
      currency: state.currency,
    );
  }
}
