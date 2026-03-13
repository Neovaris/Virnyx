import '../sales/history/sales_models.dart';
import '../sales/payment/payment_method.dart';

class ReceiptFormatter {
  static String format(Sale s) {
    final b = StringBuffer();

    void line([String value = '']) => b.writeln(value);

    String money(double v) => 'GHS ${v.toStringAsFixed(2)}';

    line('VIRNYX POS');
    line('Sales Receipt');
    line('--------------------------------');

    line('Receipt: ${s.receiptNo ?? s.id}');
    line('Date: ${_fmtDateTime(s.createdAt)}');
    line('Method: ${s.method.label}');
    if ((s.shiftId ?? '').isNotEmpty) {
      line('Shift: ${s.shiftId}');
    }

    line('--------------------------------');
    line('ITEMS');

    for (final item in s.lines) {
      line(item.name);
      line('  ${item.qty} x ${money(item.unitPrice)}    ${money(item.lineTotal)}');
    }

    line('--------------------------------');
    line('Subtotal: ${money(s.subtotal)}');
    line('Tax:      ${money(s.tax)}');
    line('Total:    ${money(s.total)}');

    if (s.method == PaymentMethod.cash) {
      line('Tendered: ${money(s.tendered ?? 0)}');
      line('Change:   ${money(s.change ?? 0)}');
    }

    if ((s.reference ?? '').isNotEmpty) {
      line('Reference: ${s.reference}');
    }

    line('--------------------------------');
    line('Thank you for your purchase');

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