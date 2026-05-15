import 'package:flutter/material.dart';
import 'dart:math';
import '../../../core/constants/colors.dart';

import '../../../shared/services/api_client.dart';
import '../services/notification_service.dart';
import '../services/sale_service.dart';

class _PaymentOption {
  const _PaymentOption({
    required this.label,
    required this.apiValue,
    required this.icon,
  });

  final String label;
  final String apiValue;
  final IconData icon;
}

class CheckoutScreen extends StatefulWidget {
  const CheckoutScreen({
    super.key,
    required this.total,
    required this.items,
    required this.onComplete,
    this.discount = 0,
    this.promoCode,
  });

  final double total;
  final List<SaleLineItem> items;
  final VoidCallback onComplete;
  final double discount;
  final String? promoCode;

  @override
  State<CheckoutScreen> createState() => _CheckoutScreenState();
}

class _CheckoutScreenState extends State<CheckoutScreen> {
  final TextEditingController amountController = TextEditingController();

  String paymentMethod = 'CASH';
  bool _isSubmitting = false;
  bool _loadingPaymentMethods = true;
  List<_PaymentOption> _paymentOptions = const <_PaymentOption>[
    _PaymentOption(
      label: 'Cash',
      apiValue: 'CASH',
      icon: Icons.payments_outlined,
    ),
    _PaymentOption(label: 'MoMo', apiValue: 'MOMO', icon: Icons.phone_android),
    _PaymentOption(label: 'Card', apiValue: 'CARD', icon: Icons.credit_card),
  ];

  late final String orderId;
  late final String date;
  late final String time;

  static const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];

  @override
  void initState() {
    super.initState();

    final now = DateTime.now();

    orderId = '#${Random().nextInt(999999999).toString().padLeft(12, '0')}';
    date = "${months[now.month - 1]} ${now.day}, ${now.year}";

    final hour = now.hour % 12 == 0 ? 12 : now.hour % 12;
    final ampm = now.hour >= 12 ? 'PM' : 'AM';
    time = "$hour:${now.minute.toString().padLeft(2, '0')} $ampm";

    amountController.text = widget.total.toStringAsFixed(2);
    _loadPaymentMethods();
  }

  Future<void> _loadPaymentMethods() async {
    try {
      final Map<String, dynamic> response = await ApiClient.instance.getJson(
        '/settings/payment-methods',
      );
      final dynamic paymentMethodsRaw = response['paymentMethods'];

      if (paymentMethodsRaw is! Map<String, dynamic>) {
        if (mounted) {
          setState(() {
            _loadingPaymentMethods = false;
          });
        }
        return;
      }

      final List<_PaymentOption> options = <_PaymentOption>[
        if (paymentMethodsRaw['enableCash'] != false)
          const _PaymentOption(
            label: 'Cash',
            apiValue: 'CASH',
            icon: Icons.payments_outlined,
          ),
        if (paymentMethodsRaw['enableMobileMoney'] != false)
          const _PaymentOption(
            label: 'MoMo',
            apiValue: 'MOMO',
            icon: Icons.phone_android,
          ),
        if (paymentMethodsRaw['enableCard'] != false)
          const _PaymentOption(
            label: 'Card',
            apiValue: 'CARD',
            icon: Icons.credit_card,
          ),
      ];

      final List<_PaymentOption> safeOptions = options.isNotEmpty
          ? options
          : const <_PaymentOption>[
              _PaymentOption(
                label: 'Cash',
                apiValue: 'CASH',
                icon: Icons.payments_outlined,
              ),
            ];

      if (!mounted) return;
      setState(() {
        _paymentOptions = safeOptions;
        if (!_paymentOptions.any(
          (_PaymentOption option) => option.apiValue == paymentMethod,
        )) {
          paymentMethod = _paymentOptions.first.apiValue;
          if (paymentMethod != 'CASH') {
            amountController.text = widget.total.toStringAsFixed(2);
          }
        }
        _loadingPaymentMethods = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _loadingPaymentMethods = false;
      });
    }
  }

  double get amountReceived => double.tryParse(amountController.text) ?? 0;

  double get change => amountReceived - widget.total;

  Future<void> _completeCharge() async {
    if (_isSubmitting) return;
    if (widget.items.isEmpty) {
      _showSnack('Cart is empty. Add products before charging.');
      return;
    }

    final bool isCash = paymentMethod == 'CASH';
    final double paymentAmount = isCash ? amountReceived : widget.total;

    if (paymentAmount <= 0) {
      _showSnack('Payment amount must be greater than 0.');
      return;
    }

    if (paymentAmount + 1e-9 < widget.total) {
      _showSnack('Amount received is less than the total due.');
      return;
    }

    setState(() => _isSubmitting = true);

    try {
      final SaleResult result = await SaleService.instance.createSale(
        items: widget.items,
        payments: <SalePaymentInput>[
          SalePaymentInput(method: paymentMethod, amount: paymentAmount),
        ],
        discount: widget.discount > 0 ? widget.discount : 0,
        discountPromoCode: widget.promoCode,
      );

      if (!mounted) return;
      widget.onComplete();

      PosNotificationService.instance.add(
        PosNotificationItem(
          id: 'sale-success-${result.saleId}-${DateTime.now().millisecondsSinceEpoch}',
          title: 'Sale completed (${paymentMethod.toUpperCase()})',
          type: PosNotificationType.success,
          createdAt: DateTime.now(),
          actionLabel: 'View Sale',
          saleId: result.saleId,
        ),
      );

      final String receiptText =
          (result.receiptNo != null && result.receiptNo!.isNotEmpty)
          ? 'Receipt ${result.receiptNo}'
          : 'Sale completed successfully';
      _showSnack(receiptText);
      Navigator.pop(context, true);
    } on ApiException catch (e) {
      if (!mounted) return;
      PosNotificationService.instance.add(
        PosNotificationItem(
          id: 'sale-error-${DateTime.now().millisecondsSinceEpoch}',
          title: e.message.isEmpty
              ? 'Payment failed'
              : 'Payment failed: ${e.message}',
          type: PosNotificationType.error,
          createdAt: DateTime.now(),
        ),
      );
      _showSnack(e.message.isEmpty ? 'Unable to complete sale.' : e.message);
      setState(() => _isSubmitting = false);
    } catch (_) {
      if (!mounted) return;
      PosNotificationService.instance.add(
        PosNotificationItem(
          id: 'sale-error-${DateTime.now().millisecondsSinceEpoch}',
          title: 'Payment failed. Please try again.',
          type: PosNotificationType.error,
          createdAt: DateTime.now(),
        ),
      );
      _showSnack('Unable to complete sale. Please try again.');
      setState(() => _isSubmitting = false);
    }
  }

  void _showSnack(String message) {
    ScaffoldMessenger.of(
      context,
    ).showSnackBar(SnackBar(content: Text(message)));
  }

  @override
  Widget build(BuildContext context) {
    final TextTheme textTheme = Theme.of(context).textTheme;

    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 18),
          child: Column(
            children: [
              const SizedBox(height: 10),

              // 🔝 HEADER
              Row(
                children: [
                  _circleBtn(Icons.arrow_back, () => Navigator.pop(context)),
                  Expanded(
                    child: Text(
                      'Charge',
                      textAlign: TextAlign.center,
                      style: textTheme.titleLarge?.copyWith(
                        fontSize: 20,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                  _circleBtn(Icons.more_vert, () {}),
                ],
              ),

              const SizedBox(height: 40),

              // 💰 TOTAL CARD
              _totalCard(),

              const SizedBox(height: 30),

              // 📄 ORDER CARD
              _orderCard(),

              const SizedBox(height: 20),

              // 💳 PAYMENT
              _paymentCard(),

              const Spacer(),

              // ✅ BUTTON
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: _isSubmitting ? null : _completeCharge,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.accentLime,
                    foregroundColor: AppColors.textPrimary,
                    elevation: 0,
                    padding: const EdgeInsets.symmetric(vertical: 18),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(999),
                    ),
                  ),
                  child: Text(
                    _isSubmitting ? 'Processing...' : 'Complete Charge',
                    style: textTheme.bodyLarge?.copyWith(
                      fontSize: 16,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
              ),

              const SizedBox(height: 16),
            ],
          ),
        ),
      ),
    );
  }

  // ================= UI =================

  Widget _circleBtn(IconData icon, VoidCallback onTap) {
    return Container(
      width: 42,
      height: 42,
      decoration: const BoxDecoration(
        color: AppColors.surfaceSoft,
        shape: BoxShape.circle,
      ),
      child: IconButton(
        onPressed: onTap,
        icon: Icon(icon, size: 20, color: AppColors.textPrimary),
      ),
    );
  }

  Widget _totalCard() {
    return Container(
      width: double.infinity,
      height: 200,
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: AppColors.accentLime,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Stack(
        children: [
          Positioned(right: -20, top: -10, child: _circle(140, 0.25)),
          Positioned(right: 20, top: 10, child: _circle(90, 0.2)),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Total Amount Due',
                style: TextStyle(
                  fontSize: 15,
                  color: AppColors.accentLimeDarkText,
                  fontWeight: FontWeight.w500,
                ),
              ),
              const Spacer(),
              Text(
                'GHS ${widget.total.toStringAsFixed(2)}',
                style: const TextStyle(
                  fontSize: 40,
                  fontWeight: FontWeight.w800,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _circle(double size, double opacity) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: AppColors.cardBackground.withValues(alpha: opacity),
      ),
    );
  }

  Widget _orderCard() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Column(
        children: [
          Row(
            children: [
              const Text(
                'ID order:',
                style: TextStyle(fontWeight: FontWeight.w600),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  orderId,
                  style: const TextStyle(color: AppColors.textSecondary),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              const Text(
                'Date:',
                style: TextStyle(fontWeight: FontWeight.w600),
              ),
              const SizedBox(width: 8),
              Expanded(child: Text(date)),
              Text(time),
            ],
          ),
        ],
      ),
    );
  }

  Widget _paymentCard() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Amount Received',
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
          ),
          const SizedBox(height: 12),

          TextField(
            controller: amountController,
            keyboardType: const TextInputType.numberWithOptions(decimal: true),
            enabled: paymentMethod == 'CASH',
            onChanged: (_) => setState(() {}),
            decoration: InputDecoration(
              filled: true,
              fillColor: AppColors.surfaceInput,
              contentPadding: const EdgeInsets.symmetric(
                horizontal: 16,
                vertical: 14,
              ),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(999),
                borderSide: BorderSide.none,
              ),
            ),
          ),

          const SizedBox(height: 16),

          if (_loadingPaymentMethods)
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 4),
              child: LinearProgressIndicator(minHeight: 3),
            ),

          ..._paymentOptions.asMap().entries.map((entry) {
            final _PaymentOption option = entry.value;
            return Padding(
              padding: EdgeInsets.only(
                bottom: entry.key == _paymentOptions.length - 1 ? 0 : 10,
              ),
              child: _paymentBtn(option.label, option.icon, option.apiValue),
            );
          }),

          const SizedBox(height: 10),

          Text(
            'Change: GHS ${change.toStringAsFixed(2)}',
            style: const TextStyle(
              color: AppColors.textSecondary,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }

  Widget _paymentBtn(String label, IconData icon, String value) {
    final selected = paymentMethod == value;

    return SizedBox(
      width: double.infinity,
      child: ElevatedButton.icon(
        onPressed: _isSubmitting
            ? null
            : () {
                setState(() {
                  paymentMethod = value;
                  if (paymentMethod != 'CASH') {
                    amountController.text = widget.total.toStringAsFixed(2);
                  }
                });
              },
        icon: Icon(icon, size: 18, color: AppColors.textPrimary),
        label: Text(
          label,
          style: const TextStyle(
            fontWeight: FontWeight.w600,
            color: AppColors.textPrimary,
          ),
        ),
        style: ElevatedButton.styleFrom(
          elevation: 0,
          backgroundColor: selected
              ? AppColors.accentLime
              : AppColors.surfaceChip,
          minimumSize: const Size.fromHeight(48),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(999),
          ),
        ),
      ),
    );
  }
}
