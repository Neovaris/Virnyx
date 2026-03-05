import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../app/theme/theme_controller.dart';
import '../shift/shift_controller.dart';
import 'cart/cart_controller.dart';
import 'catalog/catalog_provider.dart';
import 'search/clear_search_signal.dart';
import 'search/scan_event.dart';
import 'search/search_controller.dart';
import 'widgets/cart_panel.dart';
import 'widgets/category_sidebar.dart';
import 'widgets/product_grid.dart';
import 'parked/parked_sales_controller.dart';

final _lastHandledScanIdProvider = NotifierProvider<_LastHandledScanId, int>(
  _LastHandledScanId.new,
);

class _LastHandledScanId extends Notifier<int> {
  @override
  int build() => 0;
  void set(int v) => state = v;
}

class SalesScreen extends ConsumerWidget {
  const SalesScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final width = MediaQuery.of(context).size.width;
    final isWide = width >= 980;

    ref.listen<ScanEvent?>(scanEventProvider, (prev, next) {
      if (next == null) return;

      // prevent double-handling if rebuild happens
      final lastId = ref.read(_lastHandledScanIdProvider);
      if (next.id == lastId) return;
      ref.read(_lastHandledScanIdProvider.notifier).set(next.id);

      final input = next.value.trim();
      if (input.isEmpty) return;

      final catalog = ref.read(catalogProvider);

      // ✅ barcode detection mode:
      // length >= 8 AND numbers only => barcode
      final isBarcode = RegExp(r'^\d{8,}$').hasMatch(input);

      CatalogProduct? match;

      if (isBarcode) {
        // barcode match (prefix-friendly)
        match = catalog.cast<CatalogProduct?>().firstWhere(
          (p) => p!.barcode.startsWith(input),
          orElse: () => null,
        );
      } else {
        final q = input.toLowerCase();

        // SKU exact match
        match = catalog.cast<CatalogProduct?>().firstWhere(
          (p) => p!.id.toLowerCase() == q,
          orElse: () => null,
        );

        // fallback: name contains
        match ??= catalog.cast<CatalogProduct?>().firstWhere(
          (p) => p!.name.toLowerCase().contains(q),
          orElse: () => null,
        );
      }

      if (match != null) {
        ref
            .read(cartProvider.notifier)
            .add(productId: match.id, name: match.name, price: match.price);

        HapticFeedback.lightImpact();

        // Auto-clear + refocus (POS behavior)
        ref.read(clearSearchSignalProvider.notifier).bump();
      } else {
        // show toast safely next frame
        WidgetsBinding.instance.addPostFrameCallback((_) {
          if (!context.mounted) return;
          ScaffoldMessenger.of(
            context,
          ).showSnackBar(SnackBar(content: Text('No match for "$input"')));
        });
      }

      // one-shot event
      ref.read(scanEventProvider.notifier).clear();
    });

    return Scaffold(
      appBar: AppBar(
        titleSpacing: 12,
        title: Row(
          children: [
            const Text('Virnyx'),
            const SizedBox(width: 12),
            Expanded(
              child: ConstrainedBox(
                constraints: BoxConstraints(maxWidth: 720),
                child: _SalesSearchField(),
              ),
            ),
          ],
        ),
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
          IconButton(
            tooltip: 'Sales history',
            onPressed: () => context.go('/history'),
            icon: const Icon(Icons.receipt_long),
          ),
          const SizedBox(width: 8),
        ],
      ),
      endDrawer: _ParkedSalesDrawer(),
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

class _SalesSearchField extends ConsumerStatefulWidget {
  const _SalesSearchField();

  @override
  ConsumerState<_SalesSearchField> createState() => _SalesSearchFieldState();
}

class _SalesSearchFieldState extends ConsumerState<_SalesSearchField> {
  late final TextEditingController _c;
  late final FocusNode _focus;

  @override
  void initState() {
    super.initState();
    _c = TextEditingController(text: ref.read(salesSearchProvider));
    _focus = FocusNode();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) _focus.requestFocus();
    });
  }

  @override
  void dispose() {
    _c.dispose();
    _focus.dispose();
    super.dispose();
  }

  void _clearAndRefocus() {
    _c.clear();
    ref.read(salesSearchProvider.notifier).clear();
    _focus.requestFocus();
  }

  @override
  Widget build(BuildContext context) {
    ref.listen<int>(clearSearchSignalProvider, (prev, next) {
      _clearAndRefocus();
    });

    return Focus(
      onFocusChange: (hasFocus) {
        if (!hasFocus) {
          Future.delayed(const Duration(milliseconds: 120), () {
            if (mounted) _focus.requestFocus();
          });
        }
      },
      child: TextField(
        controller: _c,
        focusNode: _focus,
        autofocus: true,
        textInputAction: TextInputAction.search,
        onChanged: (v) => ref.read(salesSearchProvider.notifier).setQuery(v),
        onSubmitted: (v) => ref.read(scanEventProvider.notifier).submit(v),
        decoration: InputDecoration(
          hintText: 'Search product or scan barcode…',
          prefixIcon: const Icon(Icons.search),
          suffixIcon: _c.text.isEmpty
              ? null
              : IconButton(
                  tooltip: 'Clear',
                  onPressed: _clearAndRefocus,
                  icon: const Icon(Icons.close),
                ),
          border: const OutlineInputBorder(),
          isDense: true,
        ),
      ),
    );
  }
}

class _ParkedSalesDrawer extends ConsumerWidget {
  const _ParkedSalesDrawer();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final parked = ref.watch(parkedSalesProvider);

    return Drawer(
      child: SafeArea(
        child: Column(
          children: [
            ListTile(
              title: const Text(
                'Held Sales',
                style: TextStyle(fontWeight: FontWeight.w800),
              ),
              subtitle: Text('${parked.length} saved'),
              trailing: TextButton(
                onPressed: parked.isEmpty
                    ? null
                    : () => ref.read(parkedSalesProvider.notifier).clearAll(),
                child: const Text('Clear'),
              ),
            ),
            const Divider(height: 1),
            Expanded(
              child: parked.isEmpty
                  ? const Center(child: Text('No held sales'))
                  : ListView.separated(
                      itemCount: parked.length,
                      separatorBuilder: (_, __) => const Divider(height: 1),
                      itemBuilder: (context, i) {
                        final s = parked[i];
                        return ListTile(
                          title: Text('${s.id} • ${s.itemCount} item(s)'),
                          subtitle: Text('₵ ${s.total.toStringAsFixed(2)}'),
                          trailing: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              TextButton(
                                onPressed: () {
                                  final sale = ref
                                      .read(parkedSalesProvider.notifier)
                                      .removeById(s.id);
                                  if (sale != null) {
                                    ref
                                        .read(cartProvider.notifier)
                                        .load(sale.cart);
                                    Navigator.of(context).maybePop(); // close drawer
                                  }
                                },
                                child: const Text('Resume'),
                              ),
                              IconButton(
                                tooltip: 'Delete',
                                onPressed: () => ref
                                    .read(parkedSalesProvider.notifier)
                                    .removeById(s.id),
                                icon: const Icon(Icons.delete_outline),
                              ),
                            ],
                          ),
                        );
                      },
                    ),
            ),
          ],
        ),
      ),
    );
  }
}
