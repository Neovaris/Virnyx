import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'sales_history_controller.dart';

class SalesHistoryScreen extends ConsumerWidget {
  const SalesHistoryScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final sales = ref.watch(salesHistoryProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Sales History'),
        leading: IconButton(
          tooltip: 'Back',
          onPressed: () {
            if (context.canPop()) {
              context.pop();
            } else {
              context.go('/sales'); // POS "home"
            }
          },
          icon: const Icon(Icons.arrow_back),
        ),
        actions: [
          TextButton(
            onPressed: sales.isEmpty
                ? null
                : () => ref.read(salesHistoryProvider.notifier).clearAll(),
            child: const Text('Clear'),
          ),
          const SizedBox(width: 8),
        ],
      ),
      body: sales.isEmpty
          ? const Center(child: Text('No sales yet'))
          : ListView.separated(
              padding: const EdgeInsets.all(12),
              itemCount: sales.length,
              separatorBuilder: (_, __) => const Divider(height: 1),
              itemBuilder: (context, i) {
                final s = sales[i];
                final time =
                    '${s.createdAt.hour.toString().padLeft(2, '0')}:${s.createdAt.minute.toString().padLeft(2, '0')}';

                return ListTile(
                  title: Text(
                    s.saleId,
                    style: const TextStyle(fontWeight: FontWeight.w800),
                  ),
                  subtitle: Text('${s.lines.length} line(s) • $time'),
                  trailing: Text(
                    '₵ ${s.total.toStringAsFixed(2)}',
                    style: const TextStyle(fontWeight: FontWeight.w800),
                  ),
                  onTap: () => context.push('/history/${s.saleId}'),
                );
              },
            ),
    );
  }
}
