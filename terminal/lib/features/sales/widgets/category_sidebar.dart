import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../catalog/catalog_provider.dart';
import '../category/category_controller.dart';

class CategorySidebar extends ConsumerWidget {
  final bool compact;
  const CategorySidebar({super.key, this.compact = false});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final catalogState = ref.watch(catalogProvider);
    final products = catalogState.items;

    // v0.1 backend currently has no category field -> keep a stable fallback
    final categories = const ['All', 'Uncategorized'];

    final selected = ref.watch(selectedCategoryProvider);

    if (compact) {
      return Padding(
        padding: const EdgeInsets.all(12),
        child: Row(
          children: [
            const Text('Category:'),
            const SizedBox(width: 12),
            Expanded(
              child: DropdownButtonFormField<String>(
                value: categories.contains(selected) ? selected : 'All',
                items: categories
                    .map((c) => DropdownMenuItem(value: c, child: Text(c)))
                    .toList(),
                onChanged: (v) {
                  if (v == null) return;
                  ref.read(selectedCategoryProvider.notifier).set(v);
                },
                decoration: const InputDecoration(border: OutlineInputBorder()),
              ),
            ),
          ],
        ),
      );
    }

    return ListView.separated(
      padding: const EdgeInsets.all(12),
      itemCount: categories.length,
      separatorBuilder: (_, __) => const SizedBox(height: 6),
      itemBuilder: (context, i) {
        final c = categories[i];
        final isSelected = c == selected;

        return FilledButton.tonal(
          onPressed: () => ref.read(selectedCategoryProvider.notifier).set(c),
          style: FilledButton.styleFrom(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 14),
            alignment: Alignment.centerLeft,
          ),
          child: Row(
            children: [
              if (isSelected) const Icon(Icons.check, size: 18),
              if (isSelected) const SizedBox(width: 8),
              Text(
                c,
                style: TextStyle(
                  fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                ),
              ),
              const Spacer(),
              if (c == 'All')
                Text(
                  '${products.length}',
                  style: TextStyle(
                    color: Theme.of(context).colorScheme.onSurfaceVariant,
                    fontWeight: FontWeight.w700,
                  ),
                ),
            ],
          ),
        );
      },
    );
  }
}