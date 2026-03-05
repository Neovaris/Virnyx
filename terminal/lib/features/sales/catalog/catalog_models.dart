// lib/features/sales/catalog/catalog_models.dart

class CatalogProduct {
  final String id;
  final String name;
  final double price;
  final String sku;
  final String barcode;
  final String category; // add this because your CategorySidebar uses p.category
  final DateTime? createdAt;

  const CatalogProduct({
    required this.id,
    required this.name,
    required this.price,
    required this.sku,
    required this.barcode,
    required this.category,
    this.createdAt,
  });

  factory CatalogProduct.fromJson(Map<String, dynamic> j) {
    return CatalogProduct(
      id: (j['id'] ?? '').toString(),
      name: (j['name'] ?? '').toString(),
      price: (j['price'] as num?)?.toDouble() ?? 0,
      sku: (j['sku'] ?? '').toString(),
      barcode: (j['barcode'] ?? '').toString(),
      category: (j['category'] ?? 'Uncategorized').toString(),
      createdAt: j['createdAt'] == null
          ? null
          : DateTime.tryParse(j['createdAt'].toString()),
    );
  }
}

class CatalogState {
  final bool loading;
  final String? error;
  final List<CatalogProduct> items;

  const CatalogState({
    required this.loading,
    required this.error,
    required this.items,
  });

  const CatalogState.initial()
      : loading = false,
        error = null,
        items = const [];

  CatalogState copyWith({
    bool? loading,
    String? error,
    List<CatalogProduct>? items,
  }) {
    return CatalogState(
      loading: loading ?? this.loading,
      // keep old error unless explicitly set (better UX)
      error: error,
      items: items ?? this.items,
    );
  }
}