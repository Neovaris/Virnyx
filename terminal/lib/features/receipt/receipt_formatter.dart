import '../sales/history/sales_models.dart';
import '../sales/payment/payment_method.dart';
import '../../core/api/settings_api.dart';

class ReceiptFormatter {
  final ReceiptSettings settings;

  ReceiptFormatter({ReceiptSettings? settings})
    : settings = settings ?? ReceiptSettings.defaultSettings();

  /// Static method for backward compatibility - uses default settings
  static String formatStatic(Sale s, {ReceiptSettings? settings}) {
    return ReceiptFormatter(settings: settings).formatInstance(s);
  }

  /// Instance method - uses custom or default settings
  String formatInstance(Sale s) {
    final b = StringBuffer();

    void line([String value = '']) => b.writeln(value);

    String money(double v) => 'GHS ${v.toStringAsFixed(2)}';

    // Custom header if provided
    if ((settings.customHeader ?? '').isNotEmpty) {
      line(settings.customHeader ?? '');
      line();
    }

    // Merchant & store name (if enabled)
    if (settings.displayMerchantName) {
      line(settings.merchantName);
    }
    if (settings.displayStoreName) {
      line(settings.storeName);
    }

    line('${'=' * (settings.receiptWidth == '80MM' ? 48 : 35)}');

    // Receipt details (if enabled)
    if (settings.displayReceiptNumber) {
      line('Receipt: ${s.receiptNo ?? s.id}');
    }
    if (settings.displayTimestamp) {
      line('Date: ${_fmtDateTime(s.createdAt)}');
    }
    if (settings.showPaymentMethod) {
      line('Method: ${s.method.label}');
    }
    if ((s.shiftId ?? '').isNotEmpty) {
      line('Shift: ${s.shiftId}');
    }

    line('${'=' * (settings.receiptWidth == '80MM' ? 48 : 35)}');

    if (s.lines.isNotEmpty) {
      line('ITEMS');
      line();

      for (final item in s.lines) {
        if (settings.showProductDescription || settings.showProductSKU) {
          line(item.name);
        } else {
          line(item.name);
        }

        if (settings.showQuantity ||
            settings.showUnitPrice ||
            settings.showLineTotal) {
          final qty = settings.showQuantity ? '${item.qty} x ' : '';
          final price = settings.showUnitPrice ? money(item.unitPrice) : '';
          final total = settings.showLineTotal ? money(item.lineTotal) : '';

          final detail = [
            if (qty.isNotEmpty) qty,
            if (price.isNotEmpty) price,
            if (total.isNotEmpty) total,
          ].join('    ').trim();
          line('  $detail');
        }
      }
      line();
    }

    line('${'=' * (settings.receiptWidth == '80MM' ? 48 : 35)}');

    // Totals section
    if (settings.displaySubtotal) {
      line('Subtotal: ${money(s.subtotal)}');
    }
    if (settings.displayTaxBreakdown) {
      line('Tax:      ${money(s.tax)}');
    }
    if (settings.displayTotal) {
      line('Total:    ${money(s.total)}');
    }

    // Payment details
    if (s.method == PaymentMethod.cash && settings.showPaymentMethod) {
      line();
      if (s.tendered != null) line('Tendered: ${money(s.tendered!)}');
      if (settings.displayChangeDue && s.change != null) {
        line('Change:   ${money(s.change!)}');
      }
    }

    if ((s.reference ?? '').isNotEmpty && settings.showPaymentReference) {
      line('Reference: ${s.reference}');
    }

    line('${'=' * (settings.receiptWidth == '80MM' ? 48 : 35)}');

    // Custom footer if provided
    if ((settings.customFooter ?? '').isNotEmpty) {
      line();
      line(settings.customFooter ?? '');
    } else {
      line('Thank you for your purchase');
    }

    return b.toString();
  }

  static String _fmtDateTime(DateTime dt) {
    final y = dt.year.toString().padLeft(4, '0');
    final m = dt.month.toString().padLeft(2, '0');
    final d = dt.day.toString().padLeft(2, '0');
    final hh = dt.hour.toString().padLeft(2, '0');
    final mm = dt.minute.toString().padLeft(2, '0');
    return '$y-$m-$d $hh:$mm';
  }
}
