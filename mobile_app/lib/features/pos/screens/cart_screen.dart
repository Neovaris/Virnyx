import 'package:flutter/material.dart';
import '../models/cart_item.dart';
import '../services/discount_service.dart';
import '../services/sale_service.dart';
import '../../../core/constants/colors.dart';
import '../../../core/utils/helpers.dart';
import 'checkout_screen.dart';

class CartScreen extends StatefulWidget {
  const CartScreen({
    super.key,
    required this.cart,
    this.onHold,
    this.onCartChanged,
  });

  final List<CartItem> cart;
  final VoidCallback? onHold;
  final ValueChanged<Map<String, int>>? onCartChanged;

  @override
  State<CartScreen> createState() => _CartScreenState();
}

class _CartItem extends StatelessWidget {
  const _CartItem({
    required this.name,
    required this.price,
    required this.quantity,
    required this.onAdd,
    required this.onRemove,
    required this.onDelete,
  });

  final String name;
  final double price;
  final int quantity;
  final VoidCallback onAdd;
  final VoidCallback onRemove;
  final VoidCallback onDelete;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 14),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Row(
        children: [
          // IMAGE PLACEHOLDER
          Container(
            width: 70,
            height: 70,
            decoration: BoxDecoration(
              color: Colors.grey.shade400,
              borderRadius: BorderRadius.circular(14),
            ),
          ),

          const SizedBox(width: 12),

          // INFO
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(name, style: const TextStyle(fontWeight: FontWeight.w700)),
                const SizedBox(height: 6),
                Text(
                  'GHS ${price.toStringAsFixed(2)}',
                  style: const TextStyle(fontWeight: FontWeight.w700),
                ),
              ],
            ),
          ),

          // DELETE
          IconButton(
            onPressed: onDelete,
            icon: const Icon(Icons.delete_outline, color: Colors.redAccent),
          ),

          // QTY CONTROLS
          Row(
            children: [
              _qtyBtn(Icons.remove, onRemove),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 6),
                child: Text('$quantity'),
              ),
              _qtyBtn(Icons.add, onAdd),
            ],
          ),
        ],
      ),
    );
  }

  Widget _qtyBtn(IconData icon, VoidCallback onTap) {
    return Container(
      width: 28,
      height: 28,
      decoration: const BoxDecoration(
        color: AppColors.surfaceChip,
        shape: BoxShape.circle,
      ),
      child: IconButton(
        padding: EdgeInsets.zero,
        icon: Icon(icon, size: 16),
        onPressed: onTap,
      ),
    );
  }
}

class _CartScreenState extends State<CartScreen> {
  double discount = 0;
  String? appliedPromoCode;
  String? promoCodeType;

  final TextEditingController _promoController = TextEditingController();
  bool _isValidatingPromo = false;

  Map<String, int> _cartSnapshot() {
    final Map<String, int> snapshot = <String, int>{};
    for (final CartItem item in widget.cart) {
      snapshot[item.product.id] = item.quantity;
    }
    return snapshot;
  }

  void _emitCartChanged() {
    widget.onCartChanged?.call(_cartSnapshot());
  }

  @override
  void dispose() {
    _promoController.dispose();
    super.dispose();
  }

  void increase(String productId) {
    final index = widget.cart.indexWhere((i) => i.product.id == productId);

    if (index != -1) {
      widget.cart[index] = widget.cart[index].increaseQty();
    }

    _emitCartChanged();
    setState(() {});
  }

  void decrease(String productId) {
    final index = widget.cart.indexWhere((i) => i.product.id == productId);

    if (index != -1) {
      final item = widget.cart[index];

      if (item.quantity <= 1) {
        widget.cart.removeAt(index);
      } else {
        widget.cart[index] = item.decreaseQty();
      }
    }

    _emitCartChanged();
    setState(() {});
  }

  void removeItem(String productId) {
    widget.cart.removeWhere((i) => i.product.id == productId);
    _emitCartChanged();
    setState(() {});
  }

  double get subtotal =>
      widget.cart.fold(0, (sum, item) => sum + item.subtotal);

  double get total => subtotal - discount;

  @override
  Widget build(BuildContext context) {
    final cart = widget.cart;

    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      body: SafeArea(
        child: Column(
          children: [
            const SizedBox(height: 10),

            // HEADER
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Row(
                children: [
                  _circleBtn(Icons.arrow_back_rounded, () {
                    _emitCartChanged();
                    Navigator.pop(context);
                  }),
                  const Expanded(
                    child: Text(
                      'Cart',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                  const SizedBox(width: 40),
                ],
              ),
            ),

            const SizedBox(height: 16),

            // ITEMS
            Expanded(
              child: cart.isEmpty
                  ? _emptyState()
                  : ListView(
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      children: [
                        ...cart.map((item) {
                          return _CartItem(
                            name: item.product.name,
                            price: item.unitPrice,
                            quantity: item.quantity,
                            onAdd: () => increase(item.product.id),
                            onRemove: () => decrease(item.product.id),
                            onDelete: () => removeItem(item.product.id),
                          );
                        }),

                        const SizedBox(height: 20),

                        _promoSection(),

                        const SizedBox(height: 20),

                        _summary(),

                        const SizedBox(height: 80),
                      ],
                    ),
            ),

            _bottomBar(),
          ],
        ),
      ),
    );
  }

  Widget _emptyState() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(
              Icons.shopping_cart_outlined,
              size: 42,
              color: AppColors.textMuted,
            ),
            const SizedBox(height: 10),
            const Text(
              'Your cart is empty',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: 6),
            Text(
              'Add products from the home screen to continue.',
              textAlign: TextAlign.center,
              style: TextStyle(color: Colors.grey.shade600),
            ),
          ],
        ),
      ),
    );
  }

  Widget _promoSection() {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Apply Promo Code',
            style: TextStyle(fontWeight: FontWeight.w600),
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              Expanded(
                child: TextField(
                  controller: _promoController,
                  enabled: appliedPromoCode == null,
                  decoration: const InputDecoration(
                    hintText: 'Enter promo code',
                    border: OutlineInputBorder(),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              ElevatedButton(
                onPressed: appliedPromoCode != null
                    ? _removePromo
                    : _isValidatingPromo
                    ? null
                    : _applyPromo,
                child: _isValidatingPromo
                    ? const CircularProgressIndicator()
                    : Text(appliedPromoCode != null ? 'Remove' : 'Apply'),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Future<void> _applyPromo() async {
    final code = _promoController.text.trim();
    if (code.isEmpty) return;

    setState(() => _isValidatingPromo = true);

    try {
      final result = await DiscountService.instance.validatePromoCode(
        code: code,
        subtotal: subtotal,
      );

      setState(() {
        appliedPromoCode = result.code;
        promoCodeType = result.type;
        discount = result.discountAmount;
        _isValidatingPromo = false;
      });
    } catch (e) {
      setState(() => _isValidatingPromo = false);
    }
  }

  void _removePromo() {
    setState(() {
      appliedPromoCode = null;
      promoCodeType = null;
      discount = 0;
      _promoController.clear();
    });
  }

  Widget _summary() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Column(
        children: [
          _row('Sub total', subtotal),
          const SizedBox(height: 8),
          _row('Discount', discount),
          const Divider(),
          _row('Total', total, bold: true),
        ],
      ),
    );
  }

  Widget _bottomBar() {
    final isEmpty = widget.cart.isEmpty;

    return Padding(
      padding: const EdgeInsets.all(16),
      child: Row(
        children: [
          Expanded(
            child: ElevatedButton(
              onPressed: isEmpty
                  ? null
                  : () {
                      _emitCartChanged();
                      widget.onHold?.call();
                      Navigator.pop(context);
                    },
              child: const Text('Hold'),
            ),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: ElevatedButton(
              onPressed: isEmpty ? null : _checkout,
              child: const Text('Checkout'),
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _checkout() async {
    final items = widget.cart
        .map(
          (item) => SaleLineItem(
            productId: item.product.id,
            qty: item.quantity,
            price: item.unitPrice,
          ),
        )
        .toList();

    final completed = await Navigator.push<bool>(
      context,
      MaterialPageRoute(
        builder: (_) => CheckoutScreen(
          total: total,
          items: items,
          discount: discount,
          promoCode: appliedPromoCode,
          onComplete: () {
            widget.cart.clear();
            _emitCartChanged();
          },
        ),
      ),
    );

    if (!mounted) return;

    if (completed == true) {
      _emitCartChanged();
      Navigator.pop(context);
    }
  }

  Widget _circleBtn(IconData icon, VoidCallback onTap) {
    return IconButton(onPressed: onTap, icon: Icon(icon));
  }

  Widget _row(String label, double value, {bool bold = false}) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: TextStyle(
            fontWeight: bold ? FontWeight.w800 : FontWeight.w600,
          ),
        ),
        Text(
          Helpers.formatCurrency(value),
          style: TextStyle(
            fontWeight: bold ? FontWeight.w800 : FontWeight.w600,
          ),
        ),
      ],
    );
  }
}
