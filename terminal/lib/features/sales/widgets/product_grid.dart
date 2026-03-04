import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../cart/cart_controller.dart';

class ProductGrid extends ConsumerWidget {
  const ProductGrid({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final width = MediaQuery.of(context).size.width;
    final crossAxisCount = width >= 1400 ? 5 : width >= 1100 ? 4 : 3;

    final products = List.generate(
      24,
      (i) => _P(id: 'p_${i + 1}', name: 'Product ${i + 1}', price: (i + 1) * 2.5),
    );

    return GridView.builder(
      padding: const EdgeInsets.all(12),
      gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: crossAxisCount,
        childAspectRatio: 1.15,
        crossAxisSpacing: 10,
        mainAxisSpacing: 10,
      ),
      itemCount: products.length,
      itemBuilder: (context, i) {
        final p = products[i];
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
                    child: Center(child: Icon(Icons.inventory_2_outlined, size: 42)),
                  ),
                  Text(p.name, maxLines: 1, overflow: TextOverflow.ellipsis),
                  const SizedBox(height: 6),
                  Text('₵ ${p.price.toStringAsFixed(2)}',
                      style: const TextStyle(fontWeight: FontWeight.w600)),
                ],
              ),
            ),
          ),
        );
      },
    );
  }
}

class _P {
  final String id;
  final String name;
  final double price;
  _P({required this.id, required this.name, required this.price});
}