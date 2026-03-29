class MerchantSettings {
  // Tax
  final bool taxEnabled;
  final double taxRate;
  final bool pricesIncludeTax;

  // Payment Methods
  final bool enableCash;
  final bool enableCard;
  final bool enableMobileMoney;
  final bool enableCheck;
  final bool enableBankTransfer;
  final double cardSurchargePercent;
  final double mobileMoneysSurchargePercent;

  // Sales Limits
  final bool allowNegativeStock;
  final bool warnLowStock;
  final double maxDiscountPercent;
  final bool enableManualDiscount;
  final bool enableVolumeDiscount;
  final bool enableLoyaltyDiscount;
  final double maxTransactionAmount;
  final double minTransactionAmount;

  // Refund Policy
  final int refundWindowDays;
  final bool autoRestockItems;
  final double maxRefundPercentage;
  final double minRefundAmount;

  // Store Info
  final String lowStockThreshold;
  final String currency;
  final String storeName;

  const MerchantSettings({
    required this.taxEnabled,
    required this.taxRate,
    required this.pricesIncludeTax,
    required this.enableCash,
    required this.enableCard,
    required this.enableMobileMoney,
    required this.enableCheck,
    required this.enableBankTransfer,
    required this.cardSurchargePercent,
    required this.mobileMoneysSurchargePercent,
    required this.allowNegativeStock,
    required this.warnLowStock,
    required this.maxDiscountPercent,
    required this.enableManualDiscount,
    required this.enableVolumeDiscount,
    required this.enableLoyaltyDiscount,
    required this.maxTransactionAmount,
    required this.minTransactionAmount,
    required this.refundWindowDays,
    required this.autoRestockItems,
    required this.maxRefundPercentage,
    required this.minRefundAmount,
    required this.lowStockThreshold,
    required this.currency,
    required this.storeName,
  });

  factory MerchantSettings.fromJson(Map<String, dynamic> j) {
    return MerchantSettings(
      taxEnabled: (j['tax']?['taxEnabled'] ?? false) as bool,
      taxRate: ((j['tax']?['taxRate'] ?? 0) as num).toDouble(),
      pricesIncludeTax: (j['tax']?['pricesIncludeTax'] ?? false) as bool,
      enableCash: (j['paymentMethods']?['enableCash'] ?? true) as bool,
      enableCard: (j['paymentMethods']?['enableCard'] ?? true) as bool,
      enableMobileMoney:
          (j['paymentMethods']?['enableMobileMoney'] ?? true) as bool,
      enableCheck: (j['paymentMethods']?['enableCheck'] ?? false) as bool,
      enableBankTransfer:
          (j['paymentMethods']?['enableBankTransfer'] ?? false) as bool,
      cardSurchargePercent:
          ((j['paymentMethods']?['cardSurchargePercent'] ?? 0) as num)
              .toDouble(),
      mobileMoneysSurchargePercent:
          ((j['paymentMethods']?['mobileMoneysSurchargePercent'] ?? 0) as num)
              .toDouble(),
      allowNegativeStock: (j['sales']?['allowNegativeStock'] ?? false) as bool,
      warnLowStock: (j['sales']?['warnLowStock'] ?? true) as bool,
      maxDiscountPercent: ((j['sales']?['maxDiscountPercent'] ?? 50) as num)
          .toDouble(),
      enableManualDiscount:
          (j['sales']?['enableManualDiscount'] ?? true) as bool,
      enableVolumeDiscount:
          (j['sales']?['enableVolumeDiscount'] ?? false) as bool,
      enableLoyaltyDiscount:
          (j['sales']?['enableLoyaltyDiscount'] ?? false) as bool,
      maxTransactionAmount:
          ((j['sales']?['maxTransactionAmount'] ?? 999999) as num).toDouble(),
      minTransactionAmount: ((j['sales']?['minTransactionAmount'] ?? 0) as num)
          .toDouble(),
      refundWindowDays: (j['refundPolicy']?['refundWindowDays'] ?? 30) is int
          ? (j['refundPolicy']?['refundWindowDays'] ?? 30) as int
          : ((j['refundPolicy']?['refundWindowDays'] ?? 30) as num).toInt(),
      autoRestockItems:
          (j['refundPolicy']?['autoRestockItems'] ?? true) as bool,
      maxRefundPercentage:
          ((j['refundPolicy']?['maxRefundPercentage'] ?? 100) as num)
              .toDouble(),
      minRefundAmount: ((j['refundPolicy']?['minRefundAmount'] ?? 0) as num)
          .toDouble(),
      lowStockThreshold: '${(j['store']?['lowStockThreshold'] ?? 10)}',
      currency: j['merchant']?['currency'] ?? 'GHS',
      storeName:
          j['store']?['name'] ?? j['merchant']?['storeName'] ?? 'My Store',
    );
  }

  factory MerchantSettings.default_() {
    return const MerchantSettings(
      taxEnabled: false,
      taxRate: 0.0,
      pricesIncludeTax: false,
      enableCash: true,
      enableCard: true,
      enableMobileMoney: true,
      enableCheck: false,
      enableBankTransfer: false,
      cardSurchargePercent: 0.0,
      mobileMoneysSurchargePercent: 0.0,
      allowNegativeStock: false,
      warnLowStock: true,
      maxDiscountPercent: 50.0,
      enableManualDiscount: true,
      enableVolumeDiscount: false,
      enableLoyaltyDiscount: false,
      maxTransactionAmount: 999999.0,
      minTransactionAmount: 0.0,
      refundWindowDays: 30,
      autoRestockItems: true,
      maxRefundPercentage: 100.0,
      minRefundAmount: 0.0,
      lowStockThreshold: '10',
      currency: 'GHS',
      storeName: 'My Store',
    );
  }

  /// Calculate tax for a given subtotal
  double calculateTax(double subtotal) {
    if (!taxEnabled || taxRate <= 0) return 0.0;
    if (pricesIncludeTax) return 0.0; // Tax already in price
    return subtotal * (taxRate / 100.0);
  }

  /// Add payment surcharge based on payment method
  double applySurcharge(double amount, String paymentMethod) {
    if (paymentMethod == 'card' && cardSurchargePercent > 0) {
      return amount * (cardSurchargePercent / 100.0);
    }
    if (paymentMethod == 'mobileMoney' && mobileMoneysSurchargePercent > 0) {
      return amount * (mobileMoneysSurchargePercent / 100.0);
    }
    return 0.0;
  }

  /// Check if a discount percentage is allowed
  bool isDiscountAllowed(double percent) {
    return percent >= 0 && percent <= maxDiscountPercent;
  }

  /// Check if item can be refunded
  bool canRefundItem(DateTime saleDate) {
    final now = DateTime.now();
    final daysDiff = now.difference(saleDate).inDays;
    return daysDiff <= refundWindowDays;
  }

  /// Get list of enabled payment methods
  List<String> getEnabledPaymentMethods() {
    return [
      if (enableCash) 'Cash',
      if (enableCard) 'Card',
      if (enableMobileMoney) 'Mobile Money',
      if (enableCheck) 'Check',
      if (enableBankTransfer) 'Bank Transfer',
    ];
  }
}
