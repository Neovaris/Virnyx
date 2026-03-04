import 'package:flutter/material.dart';

class CategorySidebar extends StatelessWidget {
  final bool compact;
  const CategorySidebar({super.key, this.compact = false});

  @override
  Widget build(BuildContext context) {
    final categories = const ['All', 'Drinks', 'Snacks', 'Groceries', 'Cosmetics', 'Electronics'];

    if (compact) {
      return Padding(
        padding: const EdgeInsets.all(12),
        child: Row(
          children: [
            const Text('Category:'),
            const SizedBox(width: 12),
            Expanded(
              child: DropdownButtonFormField<String>(
                value: categories.first,
                items: categories.map((c) => DropdownMenuItem(value: c, child: Text(c))).toList(),
                onChanged: (_) {},
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
        final selected = i == 0; // v0.1 dummy
        return FilledButton.tonal(
          onPressed: () {},
          style: FilledButton.styleFrom(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 14),
            alignment: Alignment.centerLeft,
          ),
          child: Row(
            children: [
              if (selected) const Icon(Icons.check, size: 18),
              if (selected) const SizedBox(width: 8),
              Text(c),
            ],
          ),
        );
      },
    );
  }
}