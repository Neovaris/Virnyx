// lib/features/auth/providers/merchant_settings_provider.dart
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/merchant_settings.dart';

final merchantSettingsProvider =
    NotifierProvider<MerchantSettingsNotifier, MerchantSettings>(
  MerchantSettingsNotifier.new,
);

class MerchantSettingsNotifier extends Notifier<MerchantSettings> {
  @override
  MerchantSettings build() {
    return MerchantSettings.default_();
  }

  void setSettings(MerchantSettings settings) {
    state = settings;
  }

  void updateTaxRate(double rate) {
    state = MerchantSettings(
      taxEnabled: state.taxEnabled,
      taxRate: rate,
      pricesIncludeTax: state.pricesIncludeTax,
    );
  }

  void enableTax(bool enabled) {
    state = MerchantSettings(
      taxEnabled: enabled,
      taxRate: state.taxRate,
      pricesIncludeTax: state.pricesIncludeTax,
    );
  }
}