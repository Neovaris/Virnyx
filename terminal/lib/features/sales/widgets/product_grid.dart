import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../cart/cart_controller.dart';
import '../catalog/catalog_provider.dart';
import '../search/search_controller.dart';
import '../../inventory/inventory_provider.dart';

class ProductGrid extends ConsumerWidget {
  const ProductGrid({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final width = MediaQuery.of(context).size.width;
    final crossAxisCount = width >= 1400 ? 5 : width >= 1100 ? 4 : 3;

    final catalogState = ref.watch(catalogProvider);
    final inventoryState = ref.watch(inventoryProvider);
    final products = catalogState.items;

    final q = ref.watch(salesSearchProvider).trim().toLowerCase();

    final filtered = q.isEmpty
        ? products
        : products.where((p) {
            return p.name.toLowerCase().contains(q) ||
                p.id.toLowerCase().contains(q) ||
                p.sku.toLowerCase().contains(q) ||
                p.barcode.toLowerCase().contains(q);
          }).toList();

    if (catalogState.loading && products.isEmpty) {
      return const Center(child: CircularProgressIndicator());
    }

    if (catalogState.error != null && products.isEmpty) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text('Failed to load products:\n${catalogState.error}'),
            const SizedBox(height: 10),
            FilledButton(
              onPressed: () => ref.read(catalogProvider.notifier).refresh(),
              child: const Text('Retry'),
            ),
          ],
        ),
      );
    }

    return GridView.builder(
      padding: const EdgeInsets.all(12),
      gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: crossAxisCount,
        childAspectRatio: 1.15,
        crossAxisSpacing: 10,
        mainAxisSpacing: 10,
      ),
      itemCount: filtered.length,
      itemBuilder: (context, i) {
        final p = filtered[i];
        final stock = inventoryState.getStock(p.id);
        final isOutOfStock = stock != null && stock.isOutOfStock;
        final isLowStock = stock != null && stock.isLowStock && !isOutOfStock;

        return Card(
          color: isOutOfStock
              ? Colors.grey.withOpacity(0.3)
              : isLowStock
                  ? Colors.orange.withOpacity(0.1)
                  : null,
          child: InkWell(
            borderRadius: BorderRadius.circular(12),
            onTap: isOutOfStock
                ? null
                : () {
                    ref.read(cartProvider.notifier).add(
                          productId: p.id,
                          name: p.name,
                          price: p.price,
                        );
                  },
            child: Padding(
              padding: const EdgeInsets.all(12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    child: Center(
                      child: Stack(
                        children: [
                          Icon(
                            Icons.inventory_2_outlined,
                            size: 42,
                            color: isOutOfStock ? Colors.grey : Colors.inherit,
                          ),
                          if (isOutOfStock)
                            Positioned.fill(
                              child: Center(
                                child: Container(
                                  decoration: BoxDecoration(
                                    color: Colors.red.withOpacity(0.8),
                                    borderRadius: BorderRadius.circular(4),
                                  ),
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: 6,
                                    vertical: 4,
                                  ),
                                  child: const Text(
                                    'OUT',
                                    style: TextStyle(
                                      color: Colors.white,
                                      fontSize: 10,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                ),
                              ),
                            ),
                          if (isLowStock)
                            Positioned(
                              top: 0,
                              right: 0,
                              child: Container(
                                decoration: BoxDecoration(
                                  color: Colors.orange,
                                  borderRadius: BorderRadius.circular(12),
                                ),
                                padding: const EdgeInsets.all(4),
                                child: const Text(
                                  '⚠',
                                  style: TextStyle(fontSize: 14),
                                ),
                              ),
                            ),
                        ],
                      ),
                    ),
                  ),
                  Text(
                    p.name,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      color: isOutOfStock ? Colors.grey : Colors.inherit,
                    ),
                  ),
                  const SizedBox(height: 4),
                  if (stock != null)
                    Text(
                      'Stock: ${stock.onHand}',
                      style: TextStyle(
                        fontSize: 11,
                        color: isOutOfStock
                            ? Colors.red
                            : isLowStock
                                ? Colors.orange
                                : Colors.grey[600],
                        fontWeight: isLowStock ? FontWeight.w600 : null,
                      ),
                    ),
                  const SizedBox(height: 4),
                  Text(
                    '₵ ${p.price.toStringAsFixed(2)}',
                    style: TextStyle(
                      fontWeight: FontWeight.w600,
                      color: isOutOfStock ? Colors.grey : Colors.inherit,
                    ),
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }
}