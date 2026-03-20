import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../cart/cart_controller.dart';
import '../parked/parked_sales_controller.dart';
import '../services/discounts_api.dart';
import 'package:go_router/go_router.dart';
import 'package:uuid/uuid.dart';

class CartPanel extends ConsumerWidget {
  const CartPanel({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final cart = ref.watch(cartProvider);
    final ctrl = ref.read(cartProvider.notifier);
    final lines = cart.lines.values.toList();

    return Padding(
      padding: const EdgeInsets.all(12),
      child: Column(
        children: [
          Row(
            children: [
              Text(
                'Cart (${cart.itemCount})',
                style: const TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w700,
                ),
              ),
              const Spacer(),
              TextButton(
                onPressed: cart.lines.isEmpty
                    ? null
                    : () {
                        // park the cart then clear it
                        ref.read(parkedSalesProvider.notifier).park(cart);
                        ctrl.clear();

                        // open end drawer (held sales)
                        Scaffold.of(context).openEndDrawer();
                      },
                child: const Text('Hold'),
              ),
              TextButton(
                onPressed: () => Scaffold.of(context).openEndDrawer(),
                child: const Text('Held'),
              ),
              TextButton(
                onPressed: cart.lines.isEmpty ? null : ctrl.clear,
                child: const Text('Clear'),
              ),
            ],
          ),
          const SizedBox(height: 8),

          // Items
          Expanded(
            child: Card(
              child: lines.isEmpty
                  ? const Center(child: Text('No items yet'))
                  : ListView.separated(
                      padding: const EdgeInsets.all(8),
                      itemCount: lines.length,
                      separatorBuilder: (_, _) => const Divider(height: 1),
                      itemBuilder: (context, i) {
                        final line = lines[i];
                        return ListTile(
                          title: Text(
                            line.name,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                          subtitle: Text('₵ ${line.price.toStringAsFixed(2)}'),
                          trailing: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              IconButton(
                                tooltip: 'Decrease',
                                onPressed: () => ctrl.dec(line.productId),
                                icon: const Icon(Icons.remove_circle_outline),
                              ),
                              Text(
                                '${line.qty}',
                                style: const TextStyle(
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                              IconButton(
                                tooltip: 'Increase',
                                onPressed: () => ctrl.inc(line.productId),
                                icon: const Icon(Icons.add_circle_outline),
                              ),
                              const SizedBox(width: 6),
                              IconButton(
                                tooltip: 'Remove',
                                onPressed: () => ctrl.remove(line.productId),
                                icon: const Icon(Icons.delete_outline),
                              ),
                            ],
                          ),
                        );
                      },
                    ),
            ),
          ),

          const SizedBox(height: 10),

          // Adjustments Section (Discounts)
          Card(
            child: Padding(
              padding: const EdgeInsets.all(12),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Adjustments',
                    style: Theme.of(context).textTheme.titleMedium,
                  ),
                  const SizedBox(height: 8),
                  // Display existing adjustments
                  if (cart.adjustments.isNotEmpty)
                    Column(
                      children: [
                        ...cart.adjustments.map((adj) {
                          return Padding(
                            padding: const EdgeInsets.symmetric(vertical: 4),
                            child: Row(
                              children: [
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        adj.label,
                                        style: const TextStyle(
                                          fontWeight: FontWeight.w600,
                                        ),
                                      ),
                                      if (adj.promoCode.isNotEmpty)
                                        Text(
                                          'Code: ${adj.promoCode}',
                                          style: Theme.of(
                                            context,
                                          ).textTheme.bodySmall,
                                        ),
                                      if (adj.note.isNotEmpty)
                                        Text(
                                          'Note: ${adj.note}',
                                          style: Theme.of(
                                            context,
                                          ).textTheme.bodySmall,
                                        ),
                                    ],
                                  ),
                                ),
                                Text(
                                  '−₵ ${adj.amount.toStringAsFixed(2)}',
                                  style: const TextStyle(
                                    fontWeight: FontWeight.w700,
                                  ),
                                ),
                                IconButton(
                                  icon: const Icon(
                                    Icons.delete_outline,
                                    size: 18,
                                  ),
                                  tooltip: 'Remove adjustment',
                                  onPressed: () =>
                                      ctrl.removeAdjustment(adj.id),
                                  padding: EdgeInsets.zero,
                                  constraints: const BoxConstraints(
                                    minWidth: 32,
                                  ),
                                ),
                              ],
                            ),
                          );
                        }).toList(),
                        const Divider(),
                      ],
                    ),
                  // Add new adjustment
                  _DiscountForm(cart: cart, ctrl: ctrl),
                ],
              ),
            ),
          ),

          const SizedBox(height: 10),

          // Totals + Pay
          Card(
            child: Padding(
              padding: const EdgeInsets.all(12),
              child: Column(
                children: [
                  _row('Subtotal', '₵ ${cart.subtotal.toStringAsFixed(2)}'),
                  if (cart.adjustments.isNotEmpty)
                    _row(
                      'Adjustments',
                      '−₵ ${cart.totalAdjustments.toStringAsFixed(2)}',
                    ),
                  _row('Tax', '₵ ${cart.tax.toStringAsFixed(2)}'),
                  const Divider(),
                  _row(
                    'Total',
                    '₵ ${cart.total.toStringAsFixed(2)}',
                    bold: true,
                  ),
                  const SizedBox(height: 10),
                  SizedBox(
                    width: double.infinity,
                    height: 48,
                    child: FilledButton(
                      onPressed: cart.lines.isEmpty
                          ? null
                          : () => context.go('/pay'),
                      child: const Text('Pay'),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  static Widget _row(String label, String value, {bool bold = false}) {
    final style = bold
        ? const TextStyle(fontWeight: FontWeight.w800)
        : const TextStyle();
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        children: [
          Text(label, style: style),
          const Spacer(),
          Text(value, style: style),
        ],
      ),
    );
  }
}

class _DiscountForm extends ConsumerStatefulWidget {
  final CartState cart;
  final CartController ctrl;

  const _DiscountForm({required this.cart, required this.ctrl});

  @override
  ConsumerState<_DiscountForm> createState() => _DiscountFormState();
}

class _DiscountFormState extends ConsumerState<_DiscountForm> {
  final _promoCodeCtrl = TextEditingController();
  final _amountCtrl = TextEditingController();
  final _labelCtrl = TextEditingController();
  final _noteCtrl = TextEditingController();
  bool _isValidating = false;
  String? _validationError;

  @override
  void dispose() {
    _promoCodeCtrl.dispose();
    _amountCtrl.dispose();
    _labelCtrl.dispose();
    _noteCtrl.dispose();
    super.dispose();
  }

  Future<void> _validateAndAddPromoCode() async {
    final code = _promoCodeCtrl.text.trim();
    if (code.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter a promo code')),
      );
      return;
    }

    setState(() {
      _isValidating = true;
      _validationError = null;
    });

    try {
      final api = ref.read(discountsApiProvider);
      final result = await api.validatePromoCode(
        code: code,
        subtotal: widget.cart.subtotal,
      );

      if (!mounted) return;

      if (result.valid && result.discountAmount > 0) {
        // Add as adjustment
        final adjustment = CartAdjustment(
          id: const Uuid().v4(),
          label: result.rule?.name ?? 'Promo Code',
          amount: result.discountAmount,
          promoCode: code,
          note: '',
        );
        widget.ctrl.addAdjustment(adjustment);
        _promoCodeCtrl.clear();

        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              'Promo code applied: −₵${result.discountAmount.toStringAsFixed(2)}',
            ),
          ),
        );
      } else {
        setState(() {
          _validationError = result.message ?? 'Invalid or expired promo code';
        });
      }
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _validationError = 'Error validating code: $e';
      });
    } finally {
      if (mounted) {
        setState(() => _isValidating = false);
      }
    }
  }

  void _addManualDiscount() {
    final amount = double.tryParse(_amountCtrl.text.trim());
    final label = _labelCtrl.text.trim();

    if (label.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter a discount label')),
      );
      return;
    }

    if (amount == null || amount <= 0) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter a valid discount amount')),
      );
      return;
    }

    if (amount > widget.cart.subtotal) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Discount amount cannot exceed subtotal')),
      );
      return;
    }

    final adjustment = CartAdjustment(
      id: const Uuid().v4(),
      label: label,
      amount: amount,
      promoCode: '',
      note: _noteCtrl.text.trim(),
    );

    widget.ctrl.addAdjustment(adjustment);
    _amountCtrl.clear();
    _labelCtrl.clear();
    _noteCtrl.clear();

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('Discount added: −₵${amount.toStringAsFixed(2)}')),
    );
  }

  @override
  Widget build(BuildContext context) {
    return DefaultTabController(
      length: 2,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          TabBar(
            labelPadding: const EdgeInsets.symmetric(horizontal: 8),
            tabs: const [
              Padding(
                padding: EdgeInsets.symmetric(vertical: 8),
                child: Text('Promo Code'),
              ),
              Padding(
                padding: EdgeInsets.symmetric(vertical: 8),
                child: Text('Manual Discount'),
              ),
            ],
          ),
          SizedBox(
            height: 150,
            child: TabBarView(
              children: [
                // Promo Code Tab
                Padding(
                  padding: const EdgeInsets.all(8),
                  child: Column(
                    children: [
                      TextField(
                        controller: _promoCodeCtrl,
                        decoration: InputDecoration(
                          hintText: 'Enter promo code',
                          contentPadding: const EdgeInsets.symmetric(
                            horizontal: 12,
                            vertical: 8,
                          ),
                          border: const OutlineInputBorder(),
                          suffixIcon: _isValidating
                              ? const SizedBox(
                                  width: 20,
                                  height: 20,
                                  child: Padding(
                                    padding: EdgeInsets.all(8),
                                    child: CircularProgressIndicator(
                                      strokeWidth: 2,
                                    ),
                                  ),
                                )
                              : null,
                        ),
                        enabled: !_isValidating,
                      ),
                      if (_validationError != null)
                        Padding(
                          padding: const EdgeInsets.only(top: 8),
                          child: Text(
                            _validationError!,
                            style: TextStyle(
                              color: Theme.of(context).colorScheme.error,
                              fontSize: 12,
                            ),
                          ),
                        ),
                      const Spacer(),
                      SizedBox(
                        width: double.infinity,
                        child: FilledButton(
                          onPressed: _isValidating
                              ? null
                              : _validateAndAddPromoCode,
                          child: const Text('Apply Code'),
                        ),
                      ),
                    ],
                  ),
                ),
                // Manual Discount Tab
                Padding(
                  padding: const EdgeInsets.all(8),
                  child: SingleChildScrollView(
                    child: Column(
                      children: [
                        TextField(
                          controller: _labelCtrl,
                          decoration: const InputDecoration(
                            hintText: 'Label (e.g., Senior Discount)',
                            contentPadding: EdgeInsets.symmetric(
                              horizontal: 12,
                              vertical: 8,
                            ),
                            border: OutlineInputBorder(),
                          ),
                        ),
                        const SizedBox(height: 8),
                        Row(
                          children: [
                            Expanded(
                              child: TextField(
                                controller: _amountCtrl,
                                keyboardType: TextInputType.number,
                                decoration: const InputDecoration(
                                  hintText: 'Amount (₵)',
                                  contentPadding: EdgeInsets.symmetric(
                                    horizontal: 12,
                                    vertical: 8,
                                  ),
                                  border: OutlineInputBorder(),
                                ),
                              ),
                            ),
                            const SizedBox(width: 8),
                            Expanded(
                              child: FilledButton(
                                onPressed: _addManualDiscount,
                                child: const Text('Add'),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 8),
                        TextField(
                          controller: _noteCtrl,
                          decoration: const InputDecoration(
                            hintText: 'Note (optional)',
                            contentPadding: EdgeInsets.symmetric(
                              horizontal: 12,
                              vertical: 8,
                            ),
                            border: OutlineInputBorder(),
                          ),
                          maxLines: 1,
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
