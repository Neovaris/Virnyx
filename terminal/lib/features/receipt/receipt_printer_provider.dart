import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'receipt_printer.dart';
import 'receipt_printer_printing.dart';

final receiptPrinterProvider = Provider<ReceiptPrinter>((ref) {
  return PrintingReceiptPrinter();
});