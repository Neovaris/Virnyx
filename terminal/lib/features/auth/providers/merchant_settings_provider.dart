// lib/features/auth/providers/merchant_settings_provider.dart
import 'dart:async';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/api/api_client.dart';
import '../models/merchant_settings.dart';
import '../../../core/api/api_provider.dart';
import 'auth_provider.dart';

final merchantSettingsProvider =
    NotifierProvider<MerchantSettingsNotifier, MerchantSettings>(
      MerchantSettingsNotifier.new,
    );

class MerchantSettingsNotifier extends Notifier<MerchantSettings> {
  Timer? _refreshTimer;

  static const Duration _refreshInterval = Duration(minutes: 5);

  @override
  MerchantSettings build() {
    ref.onDispose(() => _refreshTimer?.cancel());
    // Initialize with defaults - settings will be loaded on login
    return MerchantSettings.default_();
  }

  /// Start periodic background refresh. Called after successful login.
  void startPeriodicRefresh() {
    _refreshTimer?.cancel();
    _refreshTimer = Timer.periodic(_refreshInterval, (_) => loadSettings());
  }

  /// Stop periodic background refresh. Called on logout.
  void stopPeriodicRefresh() {
    _refreshTimer?.cancel();
    _refreshTimer = null;
  }

  /// Public alias — allows callers to explicitly re-fetch settings
  /// (e.g., on app foreground resume or manual pull-to-refresh).
  Future<void> refresh() => loadSettings();

  /// Load all merchant settings from backend
  Future<void> loadSettings() async {
    try {
      final auth = ref.read(authProvider);
      final token = auth.token ?? '';

      if (token.isEmpty) {
        state = MerchantSettings.default_();
        return;
      }

      final client = ref.read(apiProvider);

      // Fetch all settings in parallel
      final responses = await Future.wait([
        client
            .getJson('/settings/merchant')
            .catchError((_) => <String, dynamic>{}),
        client
            .getJson('/settings/store')
            .catchError((_) => <String, dynamic>{}),
        client.getJson('/settings/tax').catchError((_) => <String, dynamic>{}),
        client
            .getJson('/settings/payment-methods')
            .catchError((_) => <String, dynamic>{}),
        client
            .getJson('/settings/sales')
            .catchError((_) => <String, dynamic>{}),
        client
            .getJson('/settings/refund-policy')
            .catchError((_) => <String, dynamic>{}),
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
      storeName: state.storeName,
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
      storeName: state.storeName,
    );
  }
}
