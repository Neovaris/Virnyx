import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../app/theme/theme_controller.dart';
import '../../core/offline/offline_detector.dart';
import '../shift/providers/shift_controller.dart';
import 'offline/offline_sync_service.dart';
import '../receipt/receipt_print_service.dart';

import 'cart/cart_controller.dart';
import 'catalog/catalog_models.dart';
import 'catalog/catalog_provider.dart';

import 'search/clear_search_signal.dart';
import 'search/scan_event.dart';
import 'search/search_controller.dart';

import 'widgets/cart_panel.dart';
import 'widgets/category_sidebar.dart';
import 'widgets/product_grid.dart';
import '../shell/status/terminal_status_bar.dart';
import '../shell/header/terminal_top_strip.dart';

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

  CatalogProduct? _firstWhereOrNull(
    List<CatalogProduct> items,
    bool Function(CatalogProduct p) test,
  ) {
    for (final p in items) {
      if (test(p)) return p;
    }
    return null;
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final width = MediaQuery.of(context).size.width;
    final isWide = width >= 980;

    // Listen for scan submit events (Enter)
    ref.listen<ScanEvent?>(scanEventProvider, (prev, next) {
      if (next == null) return;

      // prevent double-handling if rebuild happens
      final lastId = ref.read(_lastHandledScanIdProvider);
      if (next.id == lastId) return;
      ref.read(_lastHandledScanIdProvider.notifier).set(next.id);

      final input = next.value.trim();
      if (input.isEmpty) return;

      final catalogState = ref.read(catalogProvider);

      // If catalog is still loading, just warn (don’t fail)
      if (catalogState.loading) {
        WidgetsBinding.instance.addPostFrameCallback((_) {
          if (!context.mounted) return;
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Catalog is still loading…')),
          );
        });
        ref.read(scanEventProvider.notifier).clear();
        return;
      }

      final catalog = catalogState.items;

      // ✅ barcode detection mode:
      // length >= 8 AND numbers only => barcode
      final isBarcode = RegExp(r'^\d{8,}$').hasMatch(input);

      CatalogProduct? match;

      if (isBarcode) {
        // barcode match (prefix-friendly)
        match = _firstWhereOrNull(
          catalog,
          (p) => p.barcode.trim().isNotEmpty && p.barcode.startsWith(input),
        );
      } else {
        final q = input.toLowerCase();

        // SKU or ID exact match
        match = _firstWhereOrNull(
          catalog,
          (p) =>
              p.id.toLowerCase() == q ||
              (p.sku.trim().isNotEmpty && p.sku.toLowerCase() == q),
        );

        // fallback: name contains
        match ??= _firstWhereOrNull(
          catalog,
          (p) => p.name.toLowerCase().contains(q),
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
      appBar: null,
      endDrawer: const _ParkedSalesDrawer(),
      body: Column(
        children: [
          const TerminalTopStrip(),
          Expanded(
            child: isWide ? const _WideLayout() : const _CompactLayout(),
          ),
          const TerminalStatusBar(),
        ],
      ),
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
    setState(() {}); // refresh suffixIcon visibility
  }

  @override
  Widget build(BuildContext context) {
    // When we bump the signal, we clear + refocus.
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
        onChanged: (v) {
          ref.read(salesSearchProvider.notifier).setQuery(v);
          setState(() {}); // keep suffixIcon in sync
        },
        onSubmitted: (v) => ref.read(scanEventProvider.notifier).submit(v),
        decoration: InputDecoration(
          hintText: 'Search product or scan barcode…',
          prefixIcon: const Icon(Icons.search),
          suffixIcon: _c.text.trim().isEmpty
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
                      separatorBuilder: (_, _) => const Divider(height: 1),
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
                                    Navigator.of(context).maybePop();
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
