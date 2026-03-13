import '../sales/history/sales_models.dart';
import '../sales/payment/payment_method.dart';

class ReceiptHtmlFormatter {
  static String format(Sale s) {
    String esc(String v) => v
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');

    final createdText =
        '${s.createdAt.year.toString().padLeft(4, '0')}-'
        '${s.createdAt.month.toString().padLeft(2, '0')}-'
        '${s.createdAt.day.toString().padLeft(2, '0')} '
        '${s.createdAt.hour.toString().padLeft(2, '0')}:'
        '${s.createdAt.minute.toString().padLeft(2, '0')}';

    final items = s.lines
        .map(
          (l) => '''
<tr>
  <td>${esc(l.name)}</td>
  <td style="text-align:center;">${l.qty}</td>
  <td style="text-align:right;">₵ ${l.unitPrice.toStringAsFixed(2)}</td>
  <td style="text-align:right;">₵ ${l.lineTotal.toStringAsFixed(2)}</td>
</tr>
''',
        )
        .join();

    return '''
<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>Receipt ${esc(s.receiptNo ?? s.id)}</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      margin: 24px;
      color: #111;
    }
    .wrap {
      max-width: 720px;
      margin: 0 auto;
      border: 1px solid #ddd;
      border-radius: 12px;
      padding: 24px;
    }
    h1, h2, h3, p {
      margin: 0;
    }
    .center {
      text-align: center;
    }
    .muted {
      color: #666;
    }
    .section {
      margin-top: 20px;
    }
    .row {
      display: flex;
      justify-content: space-between;
      margin: 6px 0;
      gap: 16px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 10px;
    }
    th, td {
      border-bottom: 1px solid #eee;
      padding: 10px 6px;
    }
    th {
      text-align: left;
    }
    .total {
      font-weight: 700;
      font-size: 16px;
    }
    @media print {
      body {
        margin: 0;
      }
      .wrap {
        border: none;
        border-radius: 0;
        max-width: none;
      }
    }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="center">
      <h2>Virnyx POS</h2>
      <p class="muted">Sales Receipt</p>
    </div>

    <div class="section">
      <div class="row"><span>Receipt No.</span><strong>${esc(s.receiptNo ?? s.id)}</strong></div>
      <div class="row"><span>Date</span><span>${esc(createdText)}</span></div>
      <div class="row"><span>Method</span><span>${esc(s.method.label)}</span></div>
      ${((s.shiftId ?? '').isNotEmpty) ? '<div class="row"><span>Shift</span><span>${esc(s.shiftId!)}</span></div>' : ''}
      ${((s.reference ?? '').isNotEmpty) ? '<div class="row"><span>Reference</span><span>${esc(s.reference!)}</span></div>' : ''}
    </div>

    <div class="section">
      <h3>Items</h3>
      <table>
        <thead>
          <tr>
            <th>Item</th>
            <th style="text-align:center;">Qty</th>
            <th style="text-align:right;">Price</th>
            <th style="text-align:right;">Total</th>
          </tr>
        </thead>
        <tbody>
          $items
        </tbody>
      </table>
    </div>

    <div class="section">
      <div class="row"><span>Subtotal</span><span>₵ ${s.subtotal.toStringAsFixed(2)}</span></div>
      <div class="row"><span>Tax</span><span>₵ ${s.tax.toStringAsFixed(2)}</span></div>
      <div class="row total"><span>Total</span><span>₵ ${s.total.toStringAsFixed(2)}</span></div>
      ${s.method == PaymentMethod.cash ? '<div class="row"><span>Tendered</span><span>₵ ${(s.tendered ?? 0).toStringAsFixed(2)}</span></div>' : ''}
      ${s.method == PaymentMethod.cash ? '<div class="row"><span>Change</span><span>₵ ${(s.change ?? 0).toStringAsFixed(2)}</span></div>' : ''}
    </div>

    <div class="section center">
      <p><strong>Thank you for your purchase</strong></p>
    </div>
  </div>
</body>
</html>
''';
  }
}