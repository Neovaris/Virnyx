import 'dart:io';

import '../sales/history/sales_models.dart';
import 'receipt_formatter.dart';
import 'receipt_html_formatter.dart';
import '../../core/api/settings_api.dart';

class ReceiptExportResult {
  final String txtPath;
  final String htmlPath;

  const ReceiptExportResult({required this.txtPath, required this.htmlPath});
}

class ReceiptExporter {
  static Future<ReceiptExportResult> export(
    Sale sale, {
    ReceiptSettings? settings,
  }) async {
    final dir = Directory('${Directory.systemTemp.path}\\virnyx_receipts');
    if (!await dir.exists()) {
      await dir.create(recursive: true);
    }

    final fileBase = (sale.receiptNo ?? sale.id).replaceAll(
      RegExp(r'[^\w\-]'),
      '_',
    );

    final txtFile = File('${dir.path}\\$fileBase.txt');
    final htmlFile = File('${dir.path}\\$fileBase.html');

    await txtFile.writeAsString(
      ReceiptFormatter.formatStatic(sale, settings: settings),
    );
    await htmlFile.writeAsString(
      ReceiptHtmlFormatter.format(sale, settings: settings),
    );

    return ReceiptExportResult(txtPath: txtFile.path, htmlPath: htmlFile.path);
  }
}
