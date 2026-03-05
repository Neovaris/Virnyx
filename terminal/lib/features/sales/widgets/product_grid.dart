import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../cart/cart_controller.dart';
import '../catalog/catalog_provider.dart';
import '../search/search_controller.dart';

class ProductGrid extends ConsumerWidget {
  const ProductGrid({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final width = MediaQuery.of(context).size.width;
    final crossAxisCount = width >= 1400 ? 5 : width >= 1100 ? 4 : 3;

    final catalogState = ref.watch(catalogProvider);
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
        return Card(
          child: InkWell(
            borderRadius: BorderRadius.circular(12),
            onTap: () {
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
                  const Expanded(
                    child: Center(
                      child: Icon(Icons.inventory_2_outlined, size: 42),
                    ),
                  ),
                  Text(p.name, maxLines: 1, overflow: TextOverflow.ellipsis),
                  const SizedBox(height: 6),
                  Text(
                    '₵ ${p.price.toStringAsFixed(2)}',
                    style: const TextStyle(fontWeight: FontWeight.w600),
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