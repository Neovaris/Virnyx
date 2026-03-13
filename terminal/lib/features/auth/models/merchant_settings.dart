class MerchantSettings {
  final bool taxEnabled;
  final double taxRate;
  final bool pricesIncludeTax;

  const MerchantSettings({
    required this.taxEnabled,
    required this.taxRate,
    required this.pricesIncludeTax,
  });

  factory MerchantSettings.fromJson(Map<String, dynamic> j) {
    return MerchantSettings(
      taxEnabled: (j['taxEnabled'] ?? false) as bool,
      taxRate: ((j['taxRate'] ?? 0) as num).toDouble(),
      pricesIncludeTax: (j['pricesIncludeTax'] ?? false) as bool,
    );
  }

  factory MerchantSettings.default_() {
    return const MerchantSettings(
      taxEnabled: false,
      taxRate: 0.0,
      pricesIncludeTax: false,
    );
  }

  /// Calculate tax for a given subtotal
  double calculateTax(double subtotal) {
    if (!taxEnabled || taxRate <= 0) return 0.0;
    if (pricesIncludeTax) return 0.0; // Tax already in price
    return subtotal * (taxRate / 100.0);
  }
}
