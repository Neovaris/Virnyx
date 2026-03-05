import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../cart/cart_controller.dart';
import '../catalog/catalog_provider.dart';
import '../search/search_controller.dart';
import '../category/category_controller.dart';

class ProductGrid extends ConsumerWidget {
  const ProductGrid({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final width = MediaQuery.of(context).size.width;
    final crossAxisCount = width >= 1400
        ? 5
        : width >= 1100
        ? 4
        : 3;

    final products = ref.watch(catalogProvider);
    final q = ref.watch(salesSearchProvider).trim().toLowerCase();

    final selectedCategory = ref.watch(selectedCategoryProvider);

    final byCategory = selectedCategory == 'All'
        ? products
        : products.where((p) => p.category == selectedCategory).toList();

    final filtered = q.isEmpty
        ? byCategory
        : byCategory.where((p) {
            final name = p.name.toLowerCase();
            final sku = p.id.toLowerCase();
            final barcode = p.barcode.toLowerCase();
            return name.contains(q) || sku.contains(q) || barcode.contains(q);
          }).toList();

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
              ref
                  .read(cartProvider.notifier)
                  .add(productId: p.id, name: p.name, price: p.price);
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
