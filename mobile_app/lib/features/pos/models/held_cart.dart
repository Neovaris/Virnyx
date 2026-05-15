/// Model for a cart that has been held/saved for later.
class HeldCart {
  const HeldCart({
    required this.id,
    required this.label,
    required this.items,
    required this.heldAt,
  });

  final String id;
  final String label;
  final Map<String, int> items; // productId -> quantity
  final DateTime heldAt;

  /// Serialize to JSON for persistence
  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'id': id,
      'label': label,
      'items': items,
      'heldAt': heldAt.toIso8601String(),
    };
  }

  /// Deserialize from JSON
  factory HeldCart.fromJson(Map<String, dynamic> json) {
    return HeldCart(
      id: (json['id'] ?? '').toString(),
      label: (json['label'] ?? 'Held Sale').toString(),
      items: _parseItems(json['items']),
      heldAt: json['heldAt'] is String
          ? DateTime.parse(json['heldAt'] as String)
          : DateTime.now(),
    );
  }

  static Map<String, int> _parseItems(dynamic itemsData) {
    if (itemsData is! Map) return <String, int>{};
    return Map<String, int>.from(
      itemsData.map(
        (key, value) => MapEntry<String, int>(
          key.toString(),
          (value as num?)?.toInt() ?? 0,
        ),
      ),
    );
  }

  /// Create a copy with optional field updates
  HeldCart copyWith({
    String? id,
    String? label,
    Map<String, int>? items,
    DateTime? heldAt,
  }) {
    return HeldCart(
      id: id ?? this.id,
      label: label ?? this.label,
      items: items ?? this.items,
      heldAt: heldAt ?? this.heldAt,
    );
  }
}
