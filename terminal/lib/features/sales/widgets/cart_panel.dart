import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../cart/cart_controller.dart';
import '../parked/parked_sales_controller.dart';
import 'package:go_router/go_router.dart';

class CartPanel extends ConsumerWidget {
  const CartPanel({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final cart = ref.watch(cartProvider);
    final ctrl = ref.read(cartProvider.notifier);
    final lines = cart.lines.values.toList();

    return Padding(
      padding: const EdgeInsets.all(12),
      child: Column(
        children: [
          Row(
            children: [
              Text(
                'Cart (${cart.itemCount})',
                style: const TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w700,
                ),
              ),
              const Spacer(),
              TextButton(
                onPressed: cart.lines.isEmpty
                    ? null
                    : () {
                        // park the cart then clear it
                        ref.read(parkedSalesProvider.notifier).park(cart);
                        ctrl.clear();

                        // open end drawer (held sales)
                        Scaffold.of(context).openEndDrawer();
                      },
                child: const Text('Hold'),
              ),
              TextButton(
                onPressed: () => Scaffold.of(context).openEndDrawer(),
                child: const Text('Held'),
              ),
              TextButton(
                onPressed: cart.lines.isEmpty ? null : ctrl.clear,
                child: const Text('Clear'),
              ),
            ],
          ),
          const SizedBox(height: 8),

          // Items
          Expanded(
            child: Card(
              child: lines.isEmpty
                  ? const Center(child: Text('No items yet'))
                  : ListView.separated(
                      padding: const EdgeInsets.all(8),
                      itemCount: lines.length,
                      separatorBuilder: (_, __) => const Divider(height: 1),
                      itemBuilder: (context, i) {
                        final line = lines[i];
                        return ListTile(
                          title: Text(
                            line.name,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                          subtitle: Text('₵ ${line.price.toStringAsFixed(2)}'),
                          trailing: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              IconButton(
                                tooltip: 'Decrease',
                                onPressed: () => ctrl.dec(line.productId),
                                icon: const Icon(Icons.remove_circle_outline),
                              ),
                              Text(
                                '${line.qty}',
                                style: const TextStyle(
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                              IconButton(
                                tooltip: 'Increase',
                                onPressed: () => ctrl.inc(line.productId),
                                icon: const Icon(Icons.add_circle_outline),
                              ),
                              const SizedBox(width: 6),
                              IconButton(
                                tooltip: 'Remove',
                                onPressed: () => ctrl.remove(line.productId),
                                icon: const Icon(Icons.delete_outline),
                              ),
                            ],
                          ),
                        );
                      },
                    ),
            ),
          ),

          const SizedBox(height: 10),

          // Totals + Pay
          Card(
            child: Padding(
              padding: const EdgeInsets.all(12),
              child: Column(
                children: [
                  _row('Subtotal', '₵ ${cart.subtotal.toStringAsFixed(2)}'),
                  _row('Tax', '₵ ${cart.tax.toStringAsFixed(2)}'),
                  const Divider(),
                  _row(
                    'Total',
                    '₵ ${cart.total.toStringAsFixed(2)}',
                    bold: true,
                  ),
                  const SizedBox(height: 10),
                  SizedBox(
                    width: double.infinity,
                    height: 48,
                    child: FilledButton(
                      onPressed: cart.lines.isEmpty
                          ? null
                          : () => context.go('/pay'),
                      child: const Text('Pay'),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  static Widget _row(String label, String value, {bool bold = false}) {
    final style = bold
        ? const TextStyle(fontWeight: FontWeight.w800)
        : const TextStyle();
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        children: [
          Text(label, style: style),
          const Spacer(),
          Text(value, style: style),
        ],
      ),
    );
  }
}
