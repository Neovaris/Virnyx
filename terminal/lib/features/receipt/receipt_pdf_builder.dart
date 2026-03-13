import 'dart:typed_data';

import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;

import '../sales/history/sales_models.dart';
import '../sales/payment/payment_method.dart';

class ReceiptPdfBuilder {
  static Future<Uint8List> build(Sale s) async {
    final pdf = pw.Document();

    String money(double v) => 'GHS ${v.toStringAsFixed(2)}';
    final createdText =
        '${s.createdAt.year.toString().padLeft(4, '0')}-'
        '${s.createdAt.month.toString().padLeft(2, '0')}-'
        '${s.createdAt.day.toString().padLeft(2, '0')} '
        '${s.createdAt.hour.toString().padLeft(2, '0')}:'
        '${s.createdAt.minute.toString().padLeft(2, '0')}';

    pdf.addPage(
      pw.Page(
        pageFormat: PdfPageFormat.a4,
        margin: const pw.EdgeInsets.all(24),
        build: (context) {
          return pw.Column(
            crossAxisAlignment: pw.CrossAxisAlignment.stretch,
            children: [
              pw.Center(
                child: pw.Column(
                  children: [
                    pw.Text(
                      'Virnyx POS',
                      style: pw.TextStyle(
                        fontSize: 20,
                        fontWeight: pw.FontWeight.bold,
                      ),
                    ),
                    pw.SizedBox(height: 4),
                    pw.Text(
                      'Sales Receipt',
                      style: const pw.TextStyle(fontSize: 11),
                    ),
                  ],
                ),
              ),
              pw.SizedBox(height: 18),

              _row('Receipt No.', s.receiptNo ?? s.id, bold: true),
              _row('Date', createdText),
              _row('Method', s.method.label),
              if ((s.shiftId ?? '').isNotEmpty) _row('Shift', s.shiftId!),
              if ((s.reference ?? '').isNotEmpty) _row('Reference', s.reference!),

              pw.SizedBox(height: 14),
              pw.Divider(),
              pw.SizedBox(height: 8),

              pw.Text(
                'Items',
                style: pw.TextStyle(
                  fontSize: 14,
                  fontWeight: pw.FontWeight.bold,
                ),
              ),
              pw.SizedBox(height: 8),

              if (s.lines.isEmpty)
                pw.Text('No items found')
              else
                ...s.lines.map(
                  (l) => pw.Padding(
                    padding: const pw.EdgeInsets.symmetric(vertical: 4),
                    child: pw.Row(
                      crossAxisAlignment: pw.CrossAxisAlignment.start,
                      children: [
                        pw.Expanded(
                          child: pw.Column(
                            crossAxisAlignment: pw.CrossAxisAlignment.start,
                            children: [
                              pw.Text(
                                l.name,
                                style: pw.TextStyle(
                                  fontWeight: pw.FontWeight.bold,
                                ),
                              ),
                              pw.SizedBox(height: 2),
                              pw.Text(
                                '${l.qty} × ${money(l.unitPrice)}',
                                style: const pw.TextStyle(fontSize: 10),
                              ),
                            ],
                          ),
                        ),
                        pw.SizedBox(width: 12),
                        pw.Text(
                          money(l.lineTotal),
                          style: pw.TextStyle(
                            fontWeight: pw.FontWeight.bold,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),

              pw.SizedBox(height: 10),
              pw.Divider(),
              pw.SizedBox(height: 8),

              _row('Subtotal', money(s.subtotal)),
              _row('Tax', money(s.tax)),
              _row('Total', money(s.total), bold: true),

              if (s.method == PaymentMethod.cash) ...[
                pw.SizedBox(height: 10),
                _row('Tendered', money(s.tendered ?? 0)),
                _row('Change', money(s.change ?? 0)),
              ],

              pw.Spacer(),
              pw.SizedBox(height: 16),
              pw.Center(
                child: pw.Text(
                  'Thank you for your purchase',
                  style: pw.TextStyle(fontWeight: pw.FontWeight.bold),
                ),
              ),
            ],
          );
        },
      ),
    );

    return pdf.save();
  }

  static pw.Widget _row(String k, String v, {bool bold = false}) {
    final style = pw.TextStyle(
      fontSize: bold ? 13 : 11,
      fontWeight: bold ? pw.FontWeight.bold : pw.FontWeight.normal,
    );

    return pw.Padding(
      padding: const pw.EdgeInsets.symmetric(vertical: 3),
      child: pw.Row(
        crossAxisAlignment: pw.CrossAxisAlignment.start,
        children: [
          pw.Expanded(child: pw.Text(k, style: style)),
          pw.SizedBox(width: 12),
          pw.Flexible(
            child: pw.Text(
              v,
              textAlign: pw.TextAlign.right,
              style: style,
            ),
          ),
        ],
      ),
    );
  }
}