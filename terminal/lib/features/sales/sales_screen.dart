import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../app/theme/theme_controller.dart';
import '../shift/shift_controller.dart';
import 'widgets/cart_panel.dart';
import 'widgets/category_sidebar.dart';
import 'widgets/product_grid.dart';

class SalesScreen extends ConsumerWidget {
  const SalesScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final width = MediaQuery.of(context).size.width;
    final isWide = width >= 980;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Virnyx Terminal • Sales'),
        actions: [
          IconButton(
            tooltip: 'Toggle theme',
            onPressed: () =>
                ref.read(themeControllerProvider.notifier).toggleLightDark(),
            icon: const Icon(Icons.brightness_6),
          ),
          IconButton(
            tooltip: 'Close shift (dev)',
            onPressed: () => ref.read(shiftProvider.notifier).closeShift(),
            icon: const Icon(Icons.logout),
          ),
          const SizedBox(width: 8),
        ],
      ),
      body: isWide ? const _WideLayout() : const _CompactLayout(),
    );
  }
}

class _WideLayout extends StatelessWidget {
  const _WideLayout();

  @override
  Widget build(BuildContext context) {
    return const Row(
      children: [
        SizedBox(width: 240, child: CategorySidebar()),
        VerticalDivider(width: 1),
        Expanded(flex: 7, child: ProductGrid()),
        VerticalDivider(width: 1),
        SizedBox(width: 380, child: CartPanel()),
      ],
    );
  }
}

class _CompactLayout extends StatelessWidget {
  const _CompactLayout();

  @override
  Widget build(BuildContext context) {
    return const Column(
      children: [
        SizedBox(height: 64, child: CategorySidebar(compact: true)),
        Divider(height: 1),
        Expanded(child: ProductGrid()),
        Divider(height: 1),
        SizedBox(height: 220, child: CartPanel()),
      ],
    );
  }
}