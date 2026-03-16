import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../receipt/receipt_exporter.dart';
import '../../receipt/receipt_printer_provider.dart';
import '../payment/payment_method.dart';
import 'sales_history_controller.dart';
import 'sales_models.dart';
import '../../../core/api/settings_api.dart';

class SaleDetailsScreen extends ConsumerWidget {
  final String saleId;
  const SaleDetailsScreen({super.key, required this.saleId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(saleDetailsProvider(saleId));
    final receiptSettingsAsync = ref.watch(receiptSettingsProvider);

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
        data: (s) => receiptSettingsAsync.when(
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (e, _) {
            // Fall back to default settings on error
            return _buildReceiptCard(
              s,
              ReceiptSettings.defaultSettings(),
              context,
              ref,
            );
          },
          data: (settings) => _buildReceiptCard(s, settings, context, ref),
        ),
      ),
    );
  }

  Widget _buildReceiptCard(
    Sale s,
    ReceiptSettings settings,
    BuildContext context,
    WidgetRef ref,
  ) {
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
                    // Custom header or default branding
                    if ((settings.customHeader ?? '').isNotEmpty)
                      Center(
                        child: Text(
                          settings.customHeader!,
                          textAlign: TextAlign.center,
                          style: const TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      )
                    else
                      Center(
                        child: Column(
                          children: [
                            if (settings.displayMerchantName)
                              Text(
                                settings.merchantName,
                                style: const TextStyle(
                                  fontSize: 20,
                                  fontWeight: FontWeight.w900,
                                ),
                              ),
                            if (settings.displayStoreName) ...[
                              const SizedBox(height: 4),
                              Text(
                                settings.storeName,
                                style: const TextStyle(
                                  fontSize: 13,
                                  color: Colors.black54,
                                ),
                              ),
                            ],
                          ],
                        ),
                      ),
                    const SizedBox(height: 16),

                    // Receipt details based on settings
                    if (settings.displayReceiptNumber)
                      _row('Receipt No.', s.receiptNo ?? s.id, bold: true),
                    if (settings.displayTimestamp) _row('Date', createdText),
                    if (settings.showPaymentMethod)
                      _row('Method', s.method.label),
                    if ((s.shiftId ?? '').isNotEmpty) _row('Shift', s.shiftId!),
                    if ((s.reference ?? '').isNotEmpty &&
                        settings.showPaymentReference)
                      _row('Reference', s.reference!),

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

                    // Items list with configurable display
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
                                    if (settings.showProductDescription ||
                                        settings.showProductSKU)
                                      const SizedBox(height: 2),
                                    if (settings.showQuantity ||
                                        settings.showUnitPrice)
                                      Text(
                                        [
                                          if (settings.showQuantity)
                                            '${l.qty} ×',
                                          if (settings.showUnitPrice)
                                            '₵ ${l.unitPrice.toStringAsFixed(2)}',
                                        ].join(' '),
                                        style: const TextStyle(
                                          color: Colors.black54,
                                        ),
                                      ),
                                  ],
                                ),
                              ),
                              if (settings.showLineTotal) ...[
                                const SizedBox(width: 12),
                                Text(
                                  '₵ ${l.lineTotal.toStringAsFixed(2)}',
                                  style: const TextStyle(
                                    fontWeight: FontWeight.w700,
                                  ),
                                ),
                              ],
                            ],
                          ),
                        ),
                      ),

                    const SizedBox(height: 10),
                    const Divider(),
                    const SizedBox(height: 6),

                    // Totals based on settings
                    if (settings.displaySubtotal)
                      _row('Subtotal', '₵ ${s.subtotal.toStringAsFixed(2)}'),
                    if (settings.displayTaxBreakdown)
                      _row('Tax', '₵ ${s.tax.toStringAsFixed(2)}'),
                    if (settings.displayTotal)
                      _row(
                        'Total',
                        '₵ ${s.total.toStringAsFixed(2)}',
                        bold: true,
                      ),

                    // Cash payment details
                    if (s.method == PaymentMethod.cash &&
                        settings.showPaymentMethod) ...[
                      const SizedBox(height: 10),
                      _row(
                        'Tendered',
                        '₵ ${(s.tendered ?? 0).toStringAsFixed(2)}',
                      ),
                      if (settings.displayChangeDue)
                        _row(
                          'Change',
                          '₵ ${(s.change ?? 0).toStringAsFixed(2)}',
                        ),
                    ],

                    const SizedBox(height: 16),
                    const Divider(),
                    const SizedBox(height: 12),

                    // Custom footer or default message
                    Center(
                      child: Text(
                        (settings.customFooter ?? '').isNotEmpty
                            ? settings.customFooter!
                            : 'Thank you for your purchase',
                        textAlign: TextAlign.center,
                        style: const TextStyle(fontWeight: FontWeight.w700),
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
                        await ref
                            .read(receiptPrinterProvider)
                            .printSale(s, settings: settings);

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
                        final result = await ReceiptExporter.export(
                          s,
                          settings: settings,
                        );

                        if (!context.mounted) return;
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(
                            content: const Text('Saved TXT + HTML receipt'),
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
            child: Text(v, textAlign: TextAlign.right, style: style),
          ),
        ],
      ),
    );
  }
}
