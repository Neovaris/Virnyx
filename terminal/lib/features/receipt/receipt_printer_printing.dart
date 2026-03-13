import 'package:printing/printing.dart';

import '../sales/history/sales_models.dart';
import 'receipt_pdf_builder.dart';
import 'receipt_printer.dart';

class PrintingReceiptPrinter implements ReceiptPrinter {
  @override
  Future<void> printSale(Sale sale) async {
    await Printing.layoutPdf(
      onLayout: (_) => ReceiptPdfBuilder.build(sale),
      name: sale.receiptNo ?? sale.id,
    );
  }
}