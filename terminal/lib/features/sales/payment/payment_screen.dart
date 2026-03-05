import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../cart/cart_controller.dart';
import '../history/sales_api.dart';
import '../history/sales_models.dart';
import '../payment/payment_method.dart';
import '../../shift/shift_controller.dart';

class PaymentScreen extends ConsumerStatefulWidget {
  const PaymentScreen({super.key});

  @override
  ConsumerState<PaymentScreen> createState() => _PaymentScreenState();
}

class _PaymentScreenState extends ConsumerState<PaymentScreen> {
  PaymentMethod method = PaymentMethod.cash;

  final tenderCtrl = TextEditingController(text: '');
  final refCtrl = TextEditingController(text: '');

  bool _submitting = false;

  @override
  void dispose() {
    tenderCtrl.dispose();
    refCtrl.dispose();
    super.dispose();
  }

  double _parseMoney(String s) => double.tryParse(s.trim()) ?? 0;

  @override
  Widget build(BuildContext context) {
    final cart = ref.watch(cartProvider);
    final total = cart.total;

    if (cart.lines.isEmpty) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (context.mounted) context.go('/sales');
      });
      return const Scaffold(body: SizedBox.shrink());
    }

    final tendered = _parseMoney(tenderCtrl.text);
    final change = (method == PaymentMethod.cash) ? (tendered - total) : 0.0;

    final canConfirm = switch (method) {
      PaymentMethod.cash => tendered >= total && total > 0,
      PaymentMethod.momo => total > 0,
      PaymentMethod.card => total > 0,
    };

    return Scaffold(
      appBar: AppBar(
        title: const Text('Payment'),
        leading: IconButton(
          tooltip: 'Back',
          onPressed: () => context.pop(),
          icon: const Icon(Icons.arrow_back),
        ),
      ),
      body: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 760),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              children: [
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(14),
                    child: Row(
                      children: [
                        const Text(
                          'Total',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                        const Spacer(),
                        Text(
                          '₵ ${total.toStringAsFixed(2)}',
                          style: const TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.w900,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 12),

                _MethodTabs(
                  value: method,
                  onChanged: (m) {
                    setState(() => method = m);
                    HapticFeedback.selectionClick();
                  },
                ),

                const SizedBox(height: 12),

                Expanded(
                  child: Card(
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: switch (method) {
                        PaymentMethod.cash => _CashPanel(
                            total: total,
                            tenderCtrl: tenderCtrl,
                            change: change,
                          ),
                        PaymentMethod.momo => _RefPanel(
                            label: 'Mobile Money reference (optional)',
                            icon: Icons.phone_android,
                            ctrl: refCtrl,
                          ),
                        PaymentMethod.card => _RefPanel(
                            label: 'Card reference (optional)',
                            icon: Icons.credit_card,
                            ctrl: refCtrl,
                          ),
                      },
                    ),
                  ),
                ),

                const SizedBox(height: 12),

                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton(
                        onPressed: _submitting ? null : () => context.pop(),
                        child: const Text('Cancel'),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: FilledButton(
                        onPressed: (!canConfirm || _submitting)
                            ? null
                            : () async {
                                setState(() => _submitting = true);

                                try {
                                  final cartNow = ref.read(cartProvider);
                                  if (cartNow.lines.isEmpty) return;

                                  final lines = cartNow.lines.values.map((l) {
                                    return SaleLine(
                                      productId: l.productId,
                                      name: l.name,
                                      unitPrice: l.price,
                                      qty: l.qty,
                                    );
                                  }).toList();

                                  final tenderedValue = (method == PaymentMethod.cash)
                                      ? _parseMoney(tenderCtrl.text)
                                      : null;

                                  final changeValue =
                                      (method == PaymentMethod.cash && tenderedValue != null)
                                          ? (tenderedValue - cartNow.total)
                                          : null;

                                  final refText = refCtrl.text.trim();
                                  final reference = (method == PaymentMethod.momo || method == PaymentMethod.card)
                                      ? (refText.isEmpty ? null : refText)
                                      : null;

                                  final shift = ref.read(shiftProvider);
                                  final shiftId = shift.shiftId;
                                  // storeId (optional): if you track it in auth/shift later
                                  const storeId = null;

                                  final sale = await ref.read(salesApiProvider).createSale(
                                        method: method,
                                        lines: lines,
                                        subtotal: cartNow.subtotal,
                                        tax: cartNow.tax,
                                        total: cartNow.total,
                                        tendered: tenderedValue,
                                        change: changeValue,
                                        reference: reference,
                                        shiftId: shiftId,
                                        storeId: storeId,
                                      );

                                  // clear cart after backend confirms
                                  ref.read(cartProvider.notifier).clear();

                                  if (!mounted) return;
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    SnackBar(content: Text('Sale saved: ${sale.id}')),
                                  );

                                  context.go('/sales');
                                } catch (e) {
                                  if (!mounted) return;
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    SnackBar(content: Text('Payment failed: $e')),
                                  );
                                } finally {
                                  if (mounted) setState(() => _submitting = false);
                                }
                              },
                        child: _submitting
                            ? const SizedBox(
                                height: 18,
                                width: 18,
                                child: CircularProgressIndicator(strokeWidth: 2),
                              )
                            : const Text('Confirm Payment'),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _MethodTabs extends StatelessWidget {
  final PaymentMethod value;
  final ValueChanged<PaymentMethod> onChanged;
  const _MethodTabs({required this.value, required this.onChanged});

  @override
  Widget build(BuildContext context) {
    Widget chip(String label, PaymentMethod m, IconData icon) {
      final selected = value == m;
      return Expanded(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 4),
          child: FilledButton.tonal(
            onPressed: () => onChanged(m),
            style: FilledButton.styleFrom(
              padding: const EdgeInsets.symmetric(vertical: 14),
              backgroundColor: selected
                  ? null
                  : Theme.of(context).colorScheme.surfaceContainerHighest,
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(icon, size: 18),
                const SizedBox(width: 8),
                Text(label, style: const TextStyle(fontWeight: FontWeight.w700)),
              ],
            ),
          ),
        ),
      );
    }

    return Row(
      children: [
        chip('Cash', PaymentMethod.cash, Icons.payments_outlined),
        chip('MoMo', PaymentMethod.momo, Icons.phone_android),
        chip('Card', PaymentMethod.card, Icons.credit_card),
      ],
    );
  }
}

class _CashPanel extends StatelessWidget {
  final double total;
  final TextEditingController tenderCtrl;
  final double change;

  const _CashPanel({
    required this.total,
    required this.tenderCtrl,
    required this.change,
  });

  @override
  Widget build(BuildContext context) {
    final changeText = change >= 0 ? '₵ ${change.toStringAsFixed(2)}' : '₵ 0.00';
    final dueText = change < 0 ? '₵ ${(-change).toStringAsFixed(2)}' : '₵ 0.00';

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('Cash Payment', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800)),
        const SizedBox(height: 12),
        TextField(
          controller: tenderCtrl,
          keyboardType: TextInputType.number,
          decoration: const InputDecoration(
            labelText: 'Tendered amount',
            prefixText: '₵ ',
            border: OutlineInputBorder(),
          ),
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            Expanded(child: _kv('Change', changeText, bold: true)),
            const SizedBox(width: 10),
            Expanded(child: _kv('Due', dueText)),
          ],
        ),
        const SizedBox(height: 12),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: [
            _quickAmt('10', tenderCtrl),
            _quickAmt('20', tenderCtrl),
            _quickAmt('50', tenderCtrl),
            _quickAmt('100', tenderCtrl),
            _quickAmt(total.toStringAsFixed(0), tenderCtrl, label: 'Exact'),
          ],
        ),
      ],
    );
  }

  static Widget _kv(String k, String v, {bool bold = false}) {
    final style = bold ? const TextStyle(fontWeight: FontWeight.w900) : const TextStyle();
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Row(
          children: [
            Text(k),
            const Spacer(),
            Text(v, style: style),
          ],
        ),
      ),
    );
  }

  static Widget _quickAmt(String amt, TextEditingController ctrl, {String? label}) {
    return OutlinedButton(
      onPressed: () => ctrl.text = amt,
      child: Text(label ?? '₵ $amt'),
    );
  }
}

class _RefPanel extends StatelessWidget {
  final String label;
  final IconData icon;
  final TextEditingController ctrl;

  const _RefPanel({
    required this.label,
    required this.icon,
    required this.ctrl,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Icon(icon),
            const SizedBox(width: 8),
            const Text('Reference', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800)),
          ],
        ),
        const SizedBox(height: 12),
        TextField(
          controller: ctrl,
          decoration: InputDecoration(
            labelText: label,
            border: const OutlineInputBorder(),
          ),
        ),
        const SizedBox(height: 10),
        const Text('v0.1: We store reference + send it to backend when creating the sale.'),
      ],
    );
  }
}