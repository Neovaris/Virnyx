import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/merchant_settings.dart';

final merchantSettingsProvider =
    StateNotifierProvider<MerchantSettingsNotifier, MerchantSettings>(
  (ref) => MerchantSettingsNotifier(),
);

class MerchantSettingsNotifier extends StateNotifier<MerchantSettings> {
  MerchantSettingsNotifier() : super(MerchantSettings.default_());

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
