import 'receipt_printer.dart';
import '../sales/history/sales_models.dart';
import 'receipt_formatter.dart';

class StubReceiptPrinter implements ReceiptPrinter {
  @override
  Future<void> printSale(Sale sale) async {
    final output = ReceiptFormatter.format(sale);
    // ignore: avoid_print
    print(output);
  }
}