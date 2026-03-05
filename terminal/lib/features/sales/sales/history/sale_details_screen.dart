import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'sales_history_controller.dart';

class SaleDetailsScreen extends ConsumerWidget {
  final String saleId;
  const SaleDetailsScreen({super.key, required this.saleId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(saleDetailsProvider(saleId));

    return Scaffold(
      appBar: AppBar(
        title: const Text('Sale Details'),
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
          return ListView(
            padding: const EdgeInsets.all(12),
            children: [
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(12),
                  child: Column(
                    children: [
                      _row('Sale', s.receiptNo ?? s.id, bold: true),
                      _row('Method', s.method.label),
                      _row('Subtotal', '₵ ${s.subtotal.toStringAsFixed(2)}'),
                      _row('Tax', '₵ ${s.tax.toStringAsFixed(2)}'),
                      const Divider(),
                      _row('Total', '₵ ${s.total.toStringAsFixed(2)}', bold: true),
                      if (s.method.apiValue == 'cash') ...[
                        const SizedBox(height: 8),
                        _row('Tendered', '₵ ${(s.tendered ?? 0).toStringAsFixed(2)}'),
                        _row('Change', '₵ ${(s.change ?? 0).toStringAsFixed(2)}'),
                      ],
                      if ((s.reference ?? '').isNotEmpty) ...[
                        const SizedBox(height: 8),
                        _row('Reference', s.reference!),
                      ],
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 10),
              const Text('Items', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800)),
              const SizedBox(height: 8),
              Card(
                child: Column(
                  children: [
                    for (final l in s.lines)
                      ListTile(
                        title: Text(l.name, maxLines: 1, overflow: TextOverflow.ellipsis),
                        subtitle: Text('${l.qty} × ₵ ${l.unitPrice.toStringAsFixed(2)}'),
                        trailing: Text(
                          '₵ ${l.lineTotal.toStringAsFixed(2)}',
                          style: const TextStyle(fontWeight: FontWeight.w700),
                        ),
                      ),
                  ],
                ),
              ),
            ],
          );
        },
      ),
    );
  }

  static Widget _row(String k, String v, {bool bold = false}) {
    final style = bold ? const TextStyle(fontWeight: FontWeight.w900) : const TextStyle();
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        children: [
          Text(k, style: style),
          const Spacer(),
          Text(v, style: style),
        ],
      ),
    );
  }
}