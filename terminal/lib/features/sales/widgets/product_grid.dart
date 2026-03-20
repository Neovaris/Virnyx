import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/api_config.dart';
import '../../inventory/inventory_provider.dart';
import '../cart/cart_controller.dart';
import '../catalog/catalog_provider.dart';
import '../category/category_controller.dart';
import '../search/search_controller.dart';

class ProductGrid extends ConsumerWidget {
  const ProductGrid({super.key});

  static const _accent = Color(0xfff97316);
  static const _pageBg = Color(0xff0b1120);
  static const _panelBg = Color(0xff10192c);
  static const _chipBg = Color(0xff131d32);
  static const _cardBg = Color(0xff121b2f);
  static const _imageBg = Color(0xff0c1528);
  static const _stroke = Color(0xff22324d);
  static const _muted = Color(0xff94a3bf);

  String _normalizeCategory(String raw) {
    final v = raw.trim().toLowerCase();
    if (v.isEmpty) return 'All';

    if (v.contains('burger') || v.contains('sandwich')) return 'Burgers';
    if (v.contains('noodle') || v.contains('pasta') || v.contains('ramen')) {
      return 'Noodles';
    }
    if (v.contains('drink') ||
        v.contains('juice') ||
        v.contains('soda') ||
        v.contains('coffee') ||
        v.contains('tea')) {
      return 'Drinks';
    }
    if (v.contains('dessert') ||
        v.contains('cake') ||
        v.contains('ice') ||
        v.contains('sweet')) {
      return 'Desserts';
    }

    return _toTitle(v);
  }

  String _toTitle(String raw) {
    if (raw.isEmpty) return raw;
    final pieces = raw.split(RegExp(r'[_\s-]+')).where((e) => e.isNotEmpty);
    return pieces
        .map((e) => '${e[0].toUpperCase()}${e.substring(1).toLowerCase()}')
        .join(' ');
  }

  String _resolveImageUrl(String? raw) {
    final value = (raw ?? '').trim();
    if (value.isEmpty) return '';
    if (value.startsWith('http://') || value.startsWith('https://')) {
      return value;
    }
    if (value.startsWith('/')) {
      return '${ApiConfig.baseUrl}$value';
    }
    return value;
  }

  IconData _categoryIcon(String category) {
    switch (category) {
      case 'Burgers':
        return Icons.lunch_dining_rounded;
      case 'Noodles':
        return Icons.ramen_dining_rounded;
      case 'Drinks':
        return Icons.local_drink_rounded;
      case 'Desserts':
        return Icons.icecream_rounded;
      case 'All':
        return Icons.widgets_rounded;
      default:
        return Icons.fastfood_rounded;
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final width = MediaQuery.of(context).size.width;
    final crossAxisCount = width >= 1750
        ? 5
        : width >= 1420
        ? 4
        : width >= 1050
        ? 3
        : width >= 720
        ? 2
        : 1;

    final childAspectRatio = width >= 1420
        ? 0.83
        : width >= 1050
        ? 0.8
        : width >= 720
        ? 0.9
        : 1.08;

    final catalogState = ref.watch(catalogProvider);
    final inventoryState = ref.watch(inventoryProvider);
    final products = catalogState.items;
    final selectedCategory = ref.watch(selectedCategoryProvider);
    final q = ref.watch(salesSearchProvider).trim().toLowerCase();

    final discoveredCategories =
        products
            .map((p) => _normalizeCategory(p.category))
            .where((c) => c != 'All')
            .toSet()
          ..removeWhere((c) => c.isEmpty);

    final preferred = ['Burgers', 'Noodles', 'Drinks', 'Desserts'];
    final categories = <String>['All'];

    for (final c in preferred) {
      if (discoveredCategories.contains(c)) {
        categories.add(c);
      }
    }

    for (final c in discoveredCategories.toList()..sort()) {
      if (!categories.contains(c)) {
        categories.add(c);
      }
    }

    final filtered = q.isEmpty
        ? products
        : products.where((p) {
            return p.name.toLowerCase().contains(q) ||
                p.id.toLowerCase().contains(q) ||
                p.sku.toLowerCase().contains(q) ||
                p.barcode.toLowerCase().contains(q);
          }).toList();

    final filteredByCategory = selectedCategory == 'All'
        ? filtered
        : filtered
              .where((p) => _normalizeCategory(p.category) == selectedCategory)
              .toList();

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

    return Container(
      decoration: const BoxDecoration(
        color: _pageBg,
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [Color(0xff0a1020), Color(0xff0e1830), Color(0xff0b1428)],
        ),
      ),
      child: Column(
        children: [
          SizedBox(
            height: 72,
            child: ListView.separated(
              padding: const EdgeInsets.fromLTRB(14, 14, 14, 8),
              scrollDirection: Axis.horizontal,
              itemCount: categories.length,
              separatorBuilder: (_, _) => const SizedBox(width: 10),
              itemBuilder: (context, i) {
                final category = categories[i];
                final isSelected = category == selectedCategory;

                return _CategoryChip(
                  label: category,
                  icon: _categoryIcon(category),
                  selected: isSelected,
                  onTap: () =>
                      ref.read(selectedCategoryProvider.notifier).set(category),
                );
              },
            ),
          ),
          Expanded(
            child: filteredByCategory.isEmpty
                ? _EmptyState(query: q, category: selectedCategory)
                : GridView.builder(
                    padding: const EdgeInsets.fromLTRB(14, 8, 14, 14),
                    gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                      crossAxisCount: crossAxisCount,
                      childAspectRatio: childAspectRatio,
                      crossAxisSpacing: 12,
                      mainAxisSpacing: 12,
                    ),
                    itemCount: filteredByCategory.length,
                    itemBuilder: (context, i) {
                      final product = filteredByCategory[i];
                      final stock = inventoryState.getStock(product.id);
                      final imageUrl = _resolveImageUrl(product.imageUrl);
                      final isOutOfStock = stock != null && stock.isOutOfStock;
                      final isLowStock =
                          stock != null && stock.isLowStock && !isOutOfStock;
                      final countText = stock == null
                          ? '--'
                          : '${stock.onHand}';

                      return _ProductCard(
                        name: product.name,
                        imageUrl: imageUrl,
                        price: product.price,
                        countText: countText,
                        isOutOfStock: isOutOfStock,
                        isLowStock: isLowStock,
                        onTap: isOutOfStock
                            ? null
                            : () {
                                ref
                                    .read(cartProvider.notifier)
                                    .add(
                                      productId: product.id,
                                      name: product.name,
                                      price: product.price,
                                    );
                              },
                      );
                    },
                  ),
          ),
        ],
      ),
    );
  }
}

class _CategoryChip extends StatelessWidget {
  const _CategoryChip({
    required this.label,
    required this.icon,
    required this.selected,
    required this.onTap,
  });

  final String label;
  final IconData icon;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      borderRadius: BorderRadius.circular(12),
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 180),
        curve: Curves.easeOut,
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        decoration: BoxDecoration(
          color: selected ? const Color(0xff1a2640) : ProductGrid._chipBg,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: selected ? ProductGrid._accent : ProductGrid._stroke,
            width: selected ? 1.4 : 1,
          ),
          boxShadow: [
            BoxShadow(
              color: selected
                  ? ProductGrid._accent.withOpacity(0.18)
                  : Colors.black.withOpacity(0.14),
              blurRadius: selected ? 14 : 9,
              offset: const Offset(0, 6),
            ),
          ],
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              icon,
              size: 17,
              color: selected
                  ? const Color(0xffffbe96)
                  : const Color(0xffb3bfd6),
            ),
            const SizedBox(width: 8),
            Text(
              label,
              style: TextStyle(
                color: Colors.white,
                fontSize: 13,
                fontWeight: selected ? FontWeight.w800 : FontWeight.w700,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ProductCard extends StatelessWidget {
  const _ProductCard({
    required this.name,
    required this.imageUrl,
    required this.price,
    required this.countText,
    required this.isOutOfStock,
    required this.isLowStock,
    required this.onTap,
  });

  final String name;
  final String imageUrl;
  final double price;
  final String countText;
  final bool isOutOfStock;
  final bool isLowStock;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final statusColor = isOutOfStock
        ? const Color(0xffef4444)
        : isLowStock
        ? const Color(0xfff59e0b)
        : const Color(0xff95a4c0);

    return Opacity(
      opacity: isOutOfStock ? 0.56 : 1,
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(18),
          onTap: onTap,
          child: Ink(
            decoration: BoxDecoration(
              color: ProductGrid._cardBg,
              borderRadius: BorderRadius.circular(18),
              border: Border.all(color: ProductGrid._stroke),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.3),
                  blurRadius: 18,
                  offset: const Offset(0, 8),
                ),
              ],
            ),
            child: Padding(
              padding: const EdgeInsets.all(10),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    child: Container(
                      width: double.infinity,
                      decoration: BoxDecoration(
                        color: ProductGrid._imageBg,
                        borderRadius: BorderRadius.circular(14),
                        gradient: const LinearGradient(
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                          colors: [Color(0xff1d2942), Color(0xff0f172b)],
                        ),
                      ),
                      child: ClipRRect(
                        borderRadius: BorderRadius.circular(14),
                        child: Stack(
                          fit: StackFit.expand,
                          children: [
                            imageUrl.isEmpty
                                ? const Center(
                                    child: Icon(
                                      Icons.fastfood_rounded,
                                      size: 38,
                                      color: ProductGrid._muted,
                                    ),
                                  )
                                : Image.network(
                                    imageUrl,
                                    fit: BoxFit.cover,
                                    errorBuilder: (_, __, ___) {
                                      return const Center(
                                        child: Icon(
                                          Icons.fastfood_rounded,
                                          size: 38,
                                          color: ProductGrid._muted,
                                        ),
                                      );
                                    },
                                    loadingBuilder: (context, child, progress) {
                                      if (progress == null) return child;
                                      return const Center(
                                        child: SizedBox(
                                          width: 22,
                                          height: 22,
                                          child: CircularProgressIndicator(
                                            strokeWidth: 2.2,
                                            color: ProductGrid._accent,
                                          ),
                                        ),
                                      );
                                    },
                                  ),
                            if (isOutOfStock || isLowStock)
                              Positioned(
                                top: 10,
                                right: 10,
                                child: _StockBadge(
                                  label: isOutOfStock ? 'OUT' : 'LOW',
                                  background: isOutOfStock
                                      ? const Color(0xff7f1d1d)
                                      : const Color(0xff78350f),
                                  foreground: isOutOfStock
                                      ? const Color(0xfffecaca)
                                      : const Color(0xfffde68a),
                                ),
                              ),
                          ],
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    name,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 18,
                      height: 1.1,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Text(
                        '\$${price.toStringAsFixed(2)}',
                        style: const TextStyle(
                          color: ProductGrid._accent,
                          fontSize: 32,
                          height: 1,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                      const Spacer(),
                      Text(
                        '$countText item',
                        style: TextStyle(
                          color: statusColor,
                          fontSize: 13,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _StockBadge extends StatelessWidget {
  const _StockBadge({
    required this.label,
    required this.background,
    required this.foreground,
  });

  final String label;
  final Color background;
  final Color foreground;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: background,
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: foreground.withOpacity(0.16)),
      ),
      child: Text(
        label,
        style: TextStyle(
          color: foreground,
          fontSize: 11,
          fontWeight: FontWeight.w800,
          letterSpacing: 0.2,
        ),
      ),
    );
  }
}

class _EmptyState extends StatelessWidget {
  const _EmptyState({required this.query, required this.category});

  final String query;
  final String category;

  @override
  Widget build(BuildContext context) {
    final hasQuery = query.isNotEmpty;

    return Center(
      child: Container(
        constraints: const BoxConstraints(maxWidth: 420),
        margin: const EdgeInsets.all(24),
        padding: const EdgeInsets.all(24),
        decoration: BoxDecoration(
          color: ProductGrid._panelBg,
          borderRadius: BorderRadius.circular(24),
          border: Border.all(color: ProductGrid._stroke),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 72,
              height: 72,
              decoration: BoxDecoration(
                color: const Color(0xff25293a),
                borderRadius: BorderRadius.circular(20),
              ),
              child: const Icon(
                Icons.fastfood_outlined,
                color: Colors.white,
                size: 34,
              ),
            ),
            const SizedBox(height: 16),
            const Text(
              'No products found',
              style: TextStyle(
                color: Colors.white,
                fontSize: 22,
                fontWeight: FontWeight.w800,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              hasQuery
                  ? 'No items matched "$query" in $category.'
                  : 'There are no items available in $category right now.',
              textAlign: TextAlign.center,
              style: const TextStyle(
                color: ProductGrid._muted,
                fontSize: 14,
                height: 1.45,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
