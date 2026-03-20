import 'receipt_printer.dart';
import '../sales/history/sales_models.dart';
import 'receipt_formatter.dart';
import '../../core/api/settings_api.dart';

class StubReceiptPrinter implements ReceiptPrinter {
  @override
  Future<void> printSale(Sale sale, {ReceiptSettings? settings}) async {
    final output = ReceiptFormatter.formatStatic(sale, settings: settings);
    // ignore: avoid_print
    print(output);
  }
}
