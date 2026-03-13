import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../receipt/receipt_exporter.dart';
import '../../receipt/receipt_printer_provider.dart';
import '../payment/payment_method.dart';
import 'sales_history_controller.dart';

class SaleDetailsScreen extends ConsumerWidget {
  final String saleId;
  const SaleDetailsScreen({super.key, required this.saleId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(saleDetailsProvider(saleId));

    return Scaffold(
      appBar: AppBar(
        title: const Text('Receipt'),
        leading: IconButton(
          tooltip: 'Back',
          onPressed: () => context.go('/history'),
          icon: const Icon(Icons.arrow_back),
        ),
      ),
      body: async.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text('Failed to load sale:\n$e', textAlign: TextAlign.center),
                const SizedBox(height: 12),
                FilledButton(
                  onPressed: () => ref.invalidate(saleDetailsProvider(saleId)),
                  child: const Text('Retry'),
                ),
              ],
            ),
          ),
        ),
        data: (s) {
          final createdText =
              '${s.createdAt.year}-${s.createdAt.month.toString().padLeft(2, '0')}-${s.createdAt.day.toString().padLeft(2, '0')} '
              '${s.createdAt.hour.toString().padLeft(2, '0')}:${s.createdAt.minute.toString().padLeft(2, '0')}';

          return Center(
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 760),
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          const Center(
                            child: Column(
                              children: [
                                Text(
                                  'Virnyx POS',
                                  style: TextStyle(
                                    fontSize: 20,
                                    fontWeight: FontWeight.w900,
                                  ),
                                ),
                                SizedBox(height: 4),
                                Text(
                                  'Sales Receipt',
                                  style: TextStyle(
                                    fontSize: 13,
                                    color: Colors.black54,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(height: 16),
                          _row('Receipt No.', s.receiptNo ?? s.id, bold: true),
                          _row('Date', createdText),
                          _row('Method', s.method.label),
                          if ((s.shiftId ?? '').isNotEmpty) _row('Shift', s.shiftId!),
                          if ((s.reference ?? '').isNotEmpty) _row('Reference', s.reference!),
                          const SizedBox(height: 10),
                          const Divider(),
                          const SizedBox(height: 6),
                          const Text(
                            'Items',
                            style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                          const SizedBox(height: 8),
                          if (s.lines.isEmpty)
                            const Padding(
                              padding: EdgeInsets.symmetric(vertical: 8),
                              child: Text('No items found'),
                            )
                          else
                            ...s.lines.map(
                              (l) => Padding(
                                padding: const EdgeInsets.symmetric(vertical: 6),
                                child: Row(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Text(
                                            l.name,
                                            style: const TextStyle(
                                              fontWeight: FontWeight.w600,
                                            ),
                                          ),
                                          const SizedBox(height: 2),
                                          Text(
                                            '${l.qty} × ₵ ${l.unitPrice.toStringAsFixed(2)}',
                                            style: const TextStyle(
                                              color: Colors.black54,
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                    const SizedBox(width: 12),
                                    Text(
                                      '₵ ${l.lineTotal.toStringAsFixed(2)}',
                                      style: const TextStyle(
                                        fontWeight: FontWeight.w700,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          const SizedBox(height: 10),
                          const Divider(),
                          const SizedBox(height: 6),
                          _row('Subtotal', '₵ ${s.subtotal.toStringAsFixed(2)}'),
                          _row('Tax', '₵ ${s.tax.toStringAsFixed(2)}'),
                          _row(
                            'Total',
                            '₵ ${s.total.toStringAsFixed(2)}',
                            bold: true,
                          ),
                          if (s.method == PaymentMethod.cash) ...[
                            const SizedBox(height: 10),
                            _row(
                              'Tendered',
                              '₵ ${(s.tendered ?? 0).toStringAsFixed(2)}',
                            ),
                            _row(
                              'Change',
                              '₵ ${(s.change ?? 0).toStringAsFixed(2)}',
                            ),
                          ],
                          const SizedBox(height: 16),
                          const Divider(),
                          const SizedBox(height: 12),
                          const Center(
                            child: Text(
                              'Thank you for your purchase',
                              style: TextStyle(fontWeight: FontWeight.w700),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),
                  Wrap(
                    spacing: 10,
                    runSpacing: 10,
                    children: [
                      SizedBox(
                        width: 170,
                        child: OutlinedButton.icon(
                          onPressed: () => context.go('/sales'),
                          icon: const Icon(Icons.point_of_sale),
                          label: const Text('New Sale'),
                        ),
                      ),
                      SizedBox(
                        width: 170,
                        child: FilledButton.icon(
                          onPressed: () async {
                            try {
                              await ref.read(receiptPrinterProvider).printSale(s);

                              if (!context.mounted) return;
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(
                                  content: Text('Receipt sent to printer queue'),
                                ),
                              );
                            } catch (e) {
                              if (!context.mounted) return;
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(content: Text('Print failed: $e')),
                              );
                            }
                          },
                          icon: const Icon(Icons.print),
                          label: const Text('Print'),
                        ),
                      ),
                      SizedBox(
                        width: 170,
                        child: OutlinedButton.icon(
                          onPressed: () async {
                            try {
                              final result = await ReceiptExporter.export(s);

                              if (!context.mounted) return;
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(
                                  content: Text('Saved TXT + HTML receipt'),
                                  action: SnackBarAction(
                                    label: 'Open Folder',
                                    onPressed: () {
                                      Process.run('explorer', [
                                        File(result.htmlPath).parent.path,
                                      ]);
                                    },
                                  ),
                                ),
                              );
                            } catch (e) {
                              if (!context.mounted) return;
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(content: Text('Export failed: $e')),
                              );
                            }
                          },
                          icon: const Icon(Icons.save_alt),
                          label: const Text('Export'),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  static Widget _row(String k, String v, {bool bold = false}) {
    final style = bold
        ? const TextStyle(fontWeight: FontWeight.w900, fontSize: 15)
        : const TextStyle(fontSize: 14);

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(child: Text(k, style: style)),
          const SizedBox(width: 12),
          Flexible(
            child: Text(
              v,
              textAlign: TextAlign.right,
              style: style,
            ),
          ),
        ],
      ),
    );
  }
}