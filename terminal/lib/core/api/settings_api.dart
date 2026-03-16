import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'api_client.dart';
import 'api_provider.dart';
import 'package:flutter/foundation.dart';

// Receipt Settings Model
class ReceiptSettings {
  final String id;
  final String merchantId;
  final String receiptWidth; // 80MM, 58MM
  final bool useLogoOnReceipt;
  final String? logoUrl;
  final String merchantName; // Configurable merchant name
  final String storeName; // Configurable store name
  final String? customHeader;
  final String? customFooter;
  final bool displayLogo;
  final bool displayMerchantName;
  final bool displayStoreName;
  final bool displayTaxId;
  final bool displayCashierName;
  final bool displayReceiptNumber;
  final bool displayTimestamp;
  final bool showProductSKU;
  final bool showProductDescription;
  final bool showUnitPrice;
  final bool showQuantity;
  final bool showLineTotal;
  final bool displaySubtotal;
  final bool displayTaxBreakdown;
  final bool displayTotal;
  final bool displayChangeDue;
  final bool showPaymentMethod;
  final bool showPaymentReference;
  final String printerType; // THERMAL, INKJET, GENERIC
  final bool printBarcode;
  final bool printQRCode;
  final bool enableEmailReceipt;
  final bool enableSMSReceipt;

  ReceiptSettings({
    required this.id,
    required this.merchantId,
    this.receiptWidth = '80MM',
    this.useLogoOnReceipt = true,
    this.logoUrl,
    this.merchantName = 'VIRNYX POS',
    this.storeName = 'Sales Receipt',
    this.customHeader,
    this.customFooter,
    this.displayLogo = true,
    this.displayMerchantName = true,
    this.displayStoreName = true,
    this.displayTaxId = false,
    this.displayCashierName = true,
    this.displayReceiptNumber = true,
    this.displayTimestamp = true,
    this.showProductSKU = false,
    this.showProductDescription = false,
    this.showUnitPrice = true,
    this.showQuantity = true,
    this.showLineTotal = true,
    this.displaySubtotal = true,
    this.displayTaxBreakdown = true,
    this.displayTotal = true,
    this.displayChangeDue = true,
    this.showPaymentMethod = true,
    this.showPaymentReference = false,
    this.printerType = 'THERMAL',
    this.printBarcode = false,
    this.printQRCode = false,
    this.enableEmailReceipt = false,
    this.enableSMSReceipt = false,
  });

  factory ReceiptSettings.fromJson(Map<String, dynamic> json) {
    final merchantName = (json['merchantName'] ?? 'VIRNYX POS') as String;
    final storeName = (json['storeName'] ?? 'Sales Receipt') as String;
    final receiptWidth = (json['receiptWidth'] ?? '80MM') as String;
    final printerType = (json['printerType'] ?? 'THERMAL') as String;

    return ReceiptSettings(
      id: json['id'] as String,
      merchantId: json['merchantId'] as String,
      receiptWidth: receiptWidth,
      useLogoOnReceipt: json['useLogoOnReceipt'] as bool? ?? true,
      logoUrl: json['logoUrl'] as String?,
      merchantName: merchantName,
      storeName: storeName,
      customHeader: json['customHeader'] as String?,
      customFooter: json['customFooter'] as String?,
      displayLogo: json['displayLogo'] as bool? ?? true,
      displayMerchantName: json['displayMerchantName'] as bool? ?? true,
      displayStoreName: json['displayStoreName'] as bool? ?? true,
      displayTaxId: json['displayTaxId'] as bool? ?? false,
      displayCashierName: json['displayCashierName'] as bool? ?? true,
      displayReceiptNumber: json['displayReceiptNumber'] as bool? ?? true,
      displayTimestamp: json['displayTimestamp'] as bool? ?? true,
      showProductSKU: json['showProductSKU'] as bool? ?? false,
      showProductDescription: json['showProductDescription'] as bool? ?? false,
      showUnitPrice: json['showUnitPrice'] as bool? ?? true,
      showQuantity: json['showQuantity'] as bool? ?? true,
      showLineTotal: json['showLineTotal'] as bool? ?? true,
      displaySubtotal: json['displaySubtotal'] as bool? ?? true,
      displayTaxBreakdown: json['displayTaxBreakdown'] as bool? ?? true,
      displayTotal: json['displayTotal'] as bool? ?? true,
      displayChangeDue: json['displayChangeDue'] as bool? ?? true,
      showPaymentMethod: json['showPaymentMethod'] as bool? ?? true,
      showPaymentReference: json['showPaymentReference'] as bool? ?? false,
      printerType: printerType,
      printBarcode: json['printBarcode'] as bool? ?? false,
      printQRCode: json['printQRCode'] as bool? ?? false,
      enableEmailReceipt: json['enableEmailReceipt'] as bool? ?? false,
      enableSMSReceipt: json['enableSMSReceipt'] as bool? ?? false,
    );
  }

  // Default receipt settings (fallback when not available)
  static ReceiptSettings defaultSettings() =>
      ReceiptSettings(id: 'default', merchantId: 'default');
}

// Sales Settings Model
class SalesSettings {
  final String id;
  final String merchantId;
  final bool allowNegativeStock;
  final bool warnLowStock;
  final int lowStockThreshold;
  final int autoReorderPoint;
  final String priceRoundingMethod; // NONE, ROUND_UP, ROUND_DOWN, NEAREST
  final bool enableDiscountApproval;
  final double discountApprovalThreshold;
  final double maxDiscountPercent;
  final String receiptNumberingMethod; // AUTO_INCREMENT, DATE_BASED, CUSTOM
  final int nextReceiptNumber;
  final String? receiptNumberPrefix;
  final bool requireApprovalForVoid;
  final double voidApprovalThreshold;
  final bool allowOfflineVoid;
  final bool enableManualDiscount;
  final bool enableVolumeDiscount;
  final bool enableLoyaltyDiscount;
  final bool displayItemTotalOnScreen;
  final bool displayRunningTotal;
  final bool requireCustomerName;
  final bool requireCustomerPhone;
  final double maxTransactionAmount;
  final double minTransactionAmount;

  SalesSettings({
    required this.id,
    required this.merchantId,
    this.allowNegativeStock = false,
    this.warnLowStock = true,
    this.lowStockThreshold = 10,
    this.autoReorderPoint = 0,
    this.priceRoundingMethod = 'NEAREST',
    this.enableDiscountApproval = false,
    this.discountApprovalThreshold = 0,
    this.maxDiscountPercent = 50,
    this.receiptNumberingMethod = 'AUTO_INCREMENT',
    this.nextReceiptNumber = 1,
    this.receiptNumberPrefix,
    this.requireApprovalForVoid = false,
    this.voidApprovalThreshold = 0,
    this.allowOfflineVoid = false,
    this.enableManualDiscount = true,
    this.enableVolumeDiscount = false,
    this.enableLoyaltyDiscount = false,
    this.displayItemTotalOnScreen = true,
    this.displayRunningTotal = true,
    this.requireCustomerName = false,
    this.requireCustomerPhone = false,
    this.maxTransactionAmount = 0,
    this.minTransactionAmount = 0,
  });

  factory SalesSettings.fromJson(Map<String, dynamic> json) {
    return SalesSettings(
      id: json['id'] as String,
      merchantId: json['merchantId'] as String,
      allowNegativeStock: json['allowNegativeStock'] as bool? ?? false,
      warnLowStock: json['warnLowStock'] as bool? ?? true,
      lowStockThreshold: json['lowStockThreshold'] as int? ?? 10,
      autoReorderPoint: json['autoReorderPoint'] as int? ?? 0,
      priceRoundingMethod: json['priceRoundingMethod'] as String? ?? 'NEAREST',
      enableDiscountApproval: json['enableDiscountApproval'] as bool? ?? false,
      discountApprovalThreshold:
          (json['discountApprovalThreshold'] as num?)?.toDouble() ?? 0,
      maxDiscountPercent:
          (json['maxDiscountPercent'] as num?)?.toDouble() ?? 50,
      receiptNumberingMethod:
          json['receiptNumberingMethod'] as String? ?? 'AUTO_INCREMENT',
      nextReceiptNumber: json['nextReceiptNumber'] as int? ?? 1,
      receiptNumberPrefix: json['receiptNumberPrefix'] as String?,
      requireApprovalForVoid: json['requireApprovalForVoid'] as bool? ?? false,
      voidApprovalThreshold:
          (json['voidApprovalThreshold'] as num?)?.toDouble() ?? 0,
      allowOfflineVoid: json['allowOfflineVoid'] as bool? ?? false,
      enableManualDiscount: json['enableManualDiscount'] as bool? ?? true,
      enableVolumeDiscount: json['enableVolumeDiscount'] as bool? ?? false,
      enableLoyaltyDiscount: json['enableLoyaltyDiscount'] as bool? ?? false,
      displayItemTotalOnScreen:
          json['displayItemTotalOnScreen'] as bool? ?? true,
      displayRunningTotal: json['displayRunningTotal'] as bool? ?? true,
      requireCustomerName: json['requireCustomerName'] as bool? ?? false,
      requireCustomerPhone: json['requireCustomerPhone'] as bool? ?? false,
      maxTransactionAmount:
          (json['maxTransactionAmount'] as num?)?.toDouble() ?? 0,
      minTransactionAmount:
          (json['minTransactionAmount'] as num?)?.toDouble() ?? 0,
    );
  }

  static SalesSettings defaultSettings() =>
      SalesSettings(id: 'default', merchantId: 'default');
}

// Settings API Service
class SettingsApi {
  final ApiClient client;

  SettingsApi({required this.client});

  Future<ReceiptSettings> getReceiptSettings() async {
    try {
      final res = await client.getJson('/settings/receipt');
      final data = res['receipt'] as Map<String, dynamic>?;
      if (data == null) return ReceiptSettings.defaultSettings();
      return ReceiptSettings.fromJson(data);
    } catch (e) {
      debugPrint('Failed to fetch receipt settings: $e');
      return ReceiptSettings.defaultSettings();
    }
  }

  Future<SalesSettings> getSalesSettings() async {
    try {
      final res = await client.getJson('/settings/sales');
      final data = res['sales'] as Map<String, dynamic>?;
      if (data == null) return SalesSettings.defaultSettings();
      return SalesSettings.fromJson(data);
    } catch (e) {
      debugPrint('Failed to fetch sales settings: $e');
      return SalesSettings.defaultSettings();
    }
  }

  Future<void> updateReceiptSettings(ReceiptSettings settings) async {
    try {
      await client.patchJson(
        '/settings/receipt',
        body: {
          'receiptWidth': settings.receiptWidth,
          'useLogoOnReceipt': settings.useLogoOnReceipt,
          'logoUrl': settings.logoUrl,
          'customHeader': settings.customHeader,
          'customFooter': settings.customFooter,
          'displayLogo': settings.displayLogo,
          'displayMerchantName': settings.displayMerchantName,
          'displayStoreName': settings.displayStoreName,
          'displayTaxId': settings.displayTaxId,
          'displayCashierName': settings.displayCashierName,
          'displayReceiptNumber': settings.displayReceiptNumber,
          'displayTimestamp': settings.displayTimestamp,
          'showProductSKU': settings.showProductSKU,
          'showProductDescription': settings.showProductDescription,
          'showUnitPrice': settings.showUnitPrice,
          'showQuantity': settings.showQuantity,
          'showLineTotal': settings.showLineTotal,
          'displaySubtotal': settings.displaySubtotal,
          'displayTaxBreakdown': settings.displayTaxBreakdown,
          'displayTotal': settings.displayTotal,
          'displayChangeDue': settings.displayChangeDue,
          'showPaymentMethod': settings.showPaymentMethod,
          'showPaymentReference': settings.showPaymentReference,
          'printerType': settings.printerType,
          'printBarcode': settings.printBarcode,
          'printQRCode': settings.printQRCode,
          'enableEmailReceipt': settings.enableEmailReceipt,
          'enableSMSReceipt': settings.enableSMSReceipt,
        },
      );
    } catch (e) {
      debugPrint('Failed to update receipt settings: $e');
      rethrow;
    }
  }
}

// Riverpod providers
final settingsApiProvider = Provider((ref) {
  final apiClient = ref.watch(apiProvider);
  return SettingsApi(client: apiClient);
});

// Receipt Settings Provider (Async)
final receiptSettingsProvider = FutureProvider<ReceiptSettings>((ref) async {
  final api = ref.watch(settingsApiProvider);
  return api.getReceiptSettings();
});

// Sales Settings Provider (Async)
final salesSettingsProvider = FutureProvider<SalesSettings>((ref) async {
  final api = ref.watch(settingsApiProvider);
  return api.getSalesSettings();
});
