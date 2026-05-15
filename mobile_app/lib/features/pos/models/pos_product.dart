class PosProduct {
  const PosProduct({
    required this.id,
    required this.name,
    required this.price,
    required this.category,
    this.sku,
    this.barcode,
    this.imageUrl,
    this.stockQty = 0,
  });

  final String id;
  final String name;
  final double price;
  final String category;
  final String? sku;
  final String? barcode;
  final String? imageUrl;
  final int stockQty;

  bool get isInStock => stockQty > 0;

  PosProduct copyWith({int? stockQty}) {
    return PosProduct(
      id: id,
      name: name,
      price: price,
      category: category,
      sku: sku,
      barcode: barcode,
      imageUrl: imageUrl,
      stockQty: stockQty ?? this.stockQty,
    );
  }

  factory PosProduct.fromProductJson(Map<String, dynamic> json) {
    return PosProduct(
      id: (json['id'] ?? '').toString(),
      name: (json['name'] ?? '').toString(),
      price: (json['price'] as num?)?.toDouble() ?? 0,
      category: (json['category'] ?? 'Uncategorized').toString(),
      sku: json['sku']?.toString(),
      barcode: json['barcode']?.toString(),
      imageUrl: json['imageUrl']?.toString(),
      stockQty: 0,
    );
  }
}
