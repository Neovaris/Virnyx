import 'package:flutter_riverpod/flutter_riverpod.dart';

class CatalogProduct {
  final String id;      // SKU for now
  final String name;
  final double price;
  final String barcode; // add now, even if stub
  final String category;

  const CatalogProduct({
    required this.id,
    required this.name,
    required this.price,
    required this.barcode,
    required this.category,
  });
}

final catalogProvider = Provider<List<CatalogProduct>>((ref) {
  // v0.1 stub. Later: fetch from backend + cache locally.
  return List.generate(24, (i) {
    final n = i + 1;
    return CatalogProduct(
      id: 'SKU$n',
      name: 'Product $n',
      price: n * 2.5,
      barcode: '1000000000$n', // fake barcode
      category: (n % 2 == 0) ? 'Drinks' : 'Snacks',
    );
  });
});