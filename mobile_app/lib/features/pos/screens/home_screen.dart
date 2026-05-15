import 'dart:async';

import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import '../../../core/constants/colors.dart';

import '../../auth/screens/sign_in_screen.dart';
import '../../auth/services/auth_service.dart';
import '../../shift/models/shift_session.dart';
import '../../shift/screens/shift_close_screen.dart';
import '../models/held_cart.dart';
import '../models/pos_product.dart';
import '../services/notification_service.dart';
import '../services/persistence_service.dart';
import '../services/product_service.dart';
import '../widgets/filter_chip.dart';
import '../widgets/search_bar.dart';
import '../widgets/section_header.dart';
import '../widgets/top_bar.dart';
import 'cart_screen.dart';
import 'sale_detail_screen.dart';
import 'sales_history_screen.dart';
import '../models/cart_item.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key, required this.shiftSession});

  final ShiftSession shiftSession;

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> with WidgetsBindingObserver {
  final GlobalKey<ScaffoldState> _scaffoldKey = GlobalKey<ScaffoldState>();
  final TextEditingController _searchController = TextEditingController();

  final Map<String, int> _cart = <String, int>{};

  List<PosProduct> _products = <PosProduct>[];
  bool _isLoading = true;
  String? _loadError;

  String _searchQuery = '';
  String _selectedCategory = 'ALL ITEMS';

  final List<HeldCart> _heldCarts = <HeldCart>[];
  final PosNotificationService _notificationService =
      PosNotificationService.instance;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _notificationService.addListener(_onNotificationsChanged);
    _restorePersistedState();
    _notificationService.startMonitoring();
    _loadProducts();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.paused ||
        state == AppLifecycleState.detached) {
      _saveCurrentState();
    }
  }

  void _onNotificationsChanged() {
    if (mounted) {
      setState(() {});
    }
  }

  /// Restore cart, held carts, and notifications from local storage
  Future<void> _restorePersistedState() async {
    try {
      await PersistenceService.initialize();
      final List<Map<String, dynamic>> savedHeldCarts =
          await PersistenceService.restoreHeldCarts();
      final Map<String, int> savedCart = await PersistenceService.restoreCart();
      final String savedCategory =
          await PersistenceService.restoreSelectedCategory();

      if (!mounted) return;

      setState(() {
        _heldCarts.clear();
        _heldCarts.addAll(
          savedHeldCarts.map(
            (Map<String, dynamic> data) => HeldCart.fromJson(data),
          ),
        );
        _cart.clear();
        _cart.addAll(savedCart);
        _selectedCategory = savedCategory;
      });

      // Restore notifications
      await _notificationService.loadPersistedNotifications();
    } catch (e) {
      debugPrint('[HomeScreen] Failed to restore persisted state: $e');
    }
  }

  /// Save current state to local storage
  Future<void> _saveCurrentState() async {
    try {
      await PersistenceService.saveCart(_cart);
      await PersistenceService.saveHeldCarts(
        _heldCarts.map((HeldCart hc) => hc.toJson()).toList(),
      );
      await PersistenceService.saveSelectedCategory(_selectedCategory);
    } catch (e) {
      debugPrint('[HomeScreen] Failed to save state: $e');
    }
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _notificationService.removeListener(_onNotificationsChanged);
    _notificationService.stopMonitoring();
    _searchController.dispose();
    _saveCurrentState();
    super.dispose();
  }

  Future<void> _loadProducts() async {
    if (!mounted) return;
    setState(() {
      _isLoading = true;
      _loadError = null;
    });
    try {
      final List<PosProduct> products = await ProductService.instance
          .fetchCatalog();
      if (!mounted) return;
      setState(() {
        _products = products;
        _isLoading = false;
        if (_selectedCategory != 'ALL ITEMS' &&
            !products.any((PosProduct p) => p.category == _selectedCategory)) {
          _selectedCategory = 'ALL ITEMS';
        }
      });
      await _notificationService.refreshMonitoring();
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _isLoading = false;
        _loadError = e.toString();
      });
    }
  }

  double get total {
    double sum = 0;
    for (final MapEntry<String, int> entry in _cart.entries) {
      final PosProduct? product = _productById(entry.key);
      if (product != null) sum += product.price * entry.value;
    }
    return sum;
  }

  int get _cartItemCount => _cart.values.fold<int>(0, (int a, int b) => a + b);

  PosProduct? _productById(String id) {
    try {
      return _products.firstWhere((PosProduct p) => p.id == id);
    } catch (_) {
      return null;
    }
  }

  List<String> get _categories {
    final Set<String> result = <String>{};
    for (final PosProduct item in _products) {
      result.add(item.category);
    }
    final List<String> values = result.toList()..sort();
    return <String>['ALL ITEMS', ...values];
  }

  List<PosProduct> get _filteredProducts {
    final String q = _searchQuery.trim().toLowerCase();
    return _products.where((PosProduct product) {
      final bool categoryMatch =
          _selectedCategory == 'ALL ITEMS' ||
          product.category == _selectedCategory;
      if (!categoryMatch) return false;
      if (q.isEmpty) return true;
      final bool textMatch = product.name.toLowerCase().contains(q);
      final bool barcodeMatch =
          product.barcode != null && product.barcode!.startsWith(q);
      return textMatch || barcodeMatch;
    }).toList();
  }

  List<PosProduct> _findMatches(String rawInput) {
    final String input = rawInput.trim().toLowerCase();
    if (input.isEmpty) return <PosProduct>[];
    final bool barcodeMode = RegExp(r'^\d{6,}$').hasMatch(input);
    return _products.where((PosProduct p) {
      if (barcodeMode) {
        return p.barcode != null && p.barcode!.startsWith(input);
      }
      final bool byName = p.name.toLowerCase().contains(input);
      final bool byBarcode =
          p.barcode != null && p.barcode!.toLowerCase().contains(input);
      return byName || byBarcode;
    }).toList();
  }

  void _onSearchChanged(String value) => setState(() => _searchQuery = value);

  void _onSearchSubmitted(String value) {
    _resolveSearch(value, addToCartWhenConfident: true, showFeedback: true);
  }

  void _resolveSearch(
    String value, {
    required bool addToCartWhenConfident,
    required bool showFeedback,
  }) {
    final String input = value.trim();
    if (input.isEmpty) return;
    final List<PosProduct> matches = _findMatches(input);
    if (matches.isEmpty) {
      if (showFeedback) _showSnack('No match for "$input"');
      return;
    }
    final bool barcodeMode = RegExp(r'^\d{6,}$').hasMatch(input);
    final bool canAutoAdd = matches.length == 1 || barcodeMode;
    if (addToCartWhenConfident && canAutoAdd) {
      final PosProduct product = matches.first;
      if (!product.isInStock) {
        if (showFeedback) _showSnack('${product.name} is out of stock');
        return;
      }
      setState(() => _cart[product.id] = (_cart[product.id] ?? 0) + 1);
      unawaited(_saveCurrentState());
      if (showFeedback) _showSnack('${product.name} added to cart');
      return;
    }
    if (showFeedback && matches.length > 1) {
      _showSnack('${matches.length} matches found. Tap an item to add.');
    }
  }

  Future<void> _openScanner() async {
    final MobileScannerController scannerController = MobileScannerController(
      detectionSpeed: DetectionSpeed.noDuplicates,
    );
    bool handled = false;

    final String? scannedCode = await showModalBottomSheet<String>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      builder: (BuildContext context) {
        return SizedBox(
          height: MediaQuery.of(context).size.height * 0.85,
          child: Column(
            children: [
              const SizedBox(height: 8),
              Container(
                width: 52,
                height: 5,
                decoration: BoxDecoration(
                  color: AppColors.handleGrey,
                  borderRadius: BorderRadius.circular(999),
                ),
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 16, 16, 10),
                child: Row(
                  children: [
                    const Expanded(
                      child: Text(
                        'Scan barcode or QR code',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                    ),
                    IconButton(
                      onPressed: () => Navigator.pop(context),
                      icon: const Icon(Icons.close),
                    ),
                  ],
                ),
              ),
              Expanded(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(18),
                    child: MobileScanner(
                      controller: scannerController,
                      onDetect: (BarcodeCapture capture) {
                        if (handled) return;
                        final String? raw =
                            capture.barcodes.firstOrNull?.rawValue;
                        if (raw == null || raw.trim().isEmpty) return;
                        handled = true;
                        Navigator.pop(context, raw.trim());
                      },
                      errorBuilder:
                          (BuildContext context, MobileScannerException error) {
                            final bool permissionDenied =
                                error.errorCode ==
                                MobileScannerErrorCode.permissionDenied;

                            return Container(
                              color: Colors.black,
                              alignment: Alignment.center,
                              padding: const EdgeInsets.all(20),
                              child: Column(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  const Icon(
                                    Icons.camera_alt_outlined,
                                    color: Colors.white,
                                    size: 44,
                                  ),
                                  const SizedBox(height: 12),
                                  Text(
                                    permissionDenied
                                        ? 'Camera permission is required to scan codes.'
                                        : 'Unable to start scanner.',
                                    textAlign: TextAlign.center,
                                    style: const TextStyle(
                                      color: Colors.white,
                                      fontSize: 16,
                                      fontWeight: FontWeight.w700,
                                    ),
                                  ),
                                  const SizedBox(height: 8),
                                  Text(
                                    permissionDenied
                                        ? 'Allow camera access for this app in your phone settings, then try again.'
                                        : error.errorCode.message,
                                    textAlign: TextAlign.center,
                                    style: TextStyle(
                                      color: Colors.grey.shade300,
                                      height: 1.35,
                                    ),
                                  ),
                                  const SizedBox(height: 16),
                                  FilledButton(
                                    onPressed: () => Navigator.pop(context),
                                    child: const Text('Close'),
                                  ),
                                ],
                              ),
                            );
                          },
                    ),
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );

    await scannerController.dispose();
    if (!mounted || scannedCode == null || scannedCode.isEmpty) return;

    _searchController.text = scannedCode;
    _onSearchChanged(scannedCode);
    _resolveSearch(
      scannedCode,
      addToCartWhenConfident: true,
      showFeedback: true,
    );
  }

  void _holdCurrentCart() {
    if (_cart.isEmpty) {
      _showSnack('Cart is empty. Add products before holding.');
      return;
    }
    final Map<String, int> snapshot = Map<String, int>.from(_cart);
    final String id =
        'HC-${DateTime.now().millisecondsSinceEpoch.toString().substring(8)}';
    setState(() {
      _heldCarts.insert(
        0,
        HeldCart(
          id: id,
          label: 'Held from cart',
          items: snapshot,
          heldAt: DateTime.now(),
        ),
      );
      _cart.clear();
      _notificationService.add(
        PosNotificationItem(
          id: 'N-HOLD-$id-${DateTime.now().millisecondsSinceEpoch}',
          title: 'Sale $id moved to held sales',
          type: PosNotificationType.info,
          createdAt: DateTime.now(),
        ),
      );
    });
    _saveCurrentState();
    _showSnack('Sale moved to held sales');
  }

  void _openMenu() => _scaffoldKey.currentState?.openDrawer();

  void _openCartScreen() {
    if (_cart.isEmpty) {
      _showSnack('Cart is empty');
      return;
    }

    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => CartScreen(
          cart: _cart.entries.map((entry) {
            final PosProduct? product = _productById(entry.key);

            if (product == null) {
              throw Exception('Product not found for cart item');
            }

            return CartItem(
              product: product,
              quantity: entry.value,
              unitPrice: product.price,
            );
          }).toList(),
          onHold: _holdCurrentCart,
          onCartChanged: (Map<String, int> updatedCart) {
            if (!mounted) return;
            setState(() {
              _cart
                ..clear()
                ..addAll(updatedCart);
            });
            unawaited(_saveCurrentState());
          },
        ),
      ),
    ).then((_) {
      if (!mounted) return;
      setState(() {});
      _saveCurrentState();
    });
  }

  Future<void> _openShiftCloseSummary() async {
    Navigator.pop(context);
    final bool? shouldLogout = await Navigator.push<bool>(
      context,
      MaterialPageRoute(
        builder: (_) => ShiftCloseScreen(session: widget.shiftSession),
      ),
    );
    if (shouldLogout == true && mounted) {
      await AuthService.instance.logout();
      if (!mounted) return;
      Navigator.pushAndRemoveUntil(
        context,
        MaterialPageRoute(builder: (_) => const SignInScreen()),
        (Route<dynamic> route) => false,
      );
    }
  }

  Future<void> _openNotificationsPanel() async {
    if (_notificationService.items.isNotEmpty) {
      _notificationService.markAllRead();
    }
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      builder: (BuildContext context) {
        return StatefulBuilder(
          builder: (BuildContext context, StateSetter modalSetState) {
            return SizedBox(
              height: MediaQuery.of(context).size.height * 0.78,
              child: Column(
                children: [
                  Padding(
                    padding: const EdgeInsets.fromLTRB(16, 12, 8, 8),
                    child: Row(
                      children: [
                        const Expanded(
                          child: Text(
                            'Notifications',
                            style: TextStyle(
                              fontSize: 20,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                        ),
                        TextButton(
                          onPressed: _notificationService.items.isEmpty
                              ? null
                              : () {
                                  _notificationService.dismissAll();
                                  modalSetState(() {});
                                },
                          child: const Text('Dismiss all'),
                        ),
                        IconButton(
                          onPressed: () => Navigator.pop(context),
                          icon: const Icon(Icons.close),
                        ),
                      ],
                    ),
                  ),
                  const Divider(height: 1),
                  Expanded(
                    child: _notificationService.items.isEmpty
                        ? const Center(child: Text('No notifications'))
                        : ListView.separated(
                            padding: const EdgeInsets.fromLTRB(16, 14, 16, 16),
                            itemCount: _notificationService.items.length,
                            separatorBuilder: (_, a) =>
                                const Divider(height: 20),
                            itemBuilder: (BuildContext context, int index) {
                              final PosNotificationItem item =
                                  _notificationService.items[index];
                              return Row(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Icon(
                                    _notificationIcon(item.type),
                                    color: _notificationColor(item.type),
                                    size: 20,
                                  ),
                                  const SizedBox(width: 10),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          item.title,
                                          style: const TextStyle(
                                            fontWeight: FontWeight.w700,
                                          ),
                                        ),
                                        if ((item.actionLabel ?? '').isNotEmpty)
                                          Padding(
                                            padding: const EdgeInsets.only(
                                              top: 4,
                                            ),
                                            child: GestureDetector(
                                              onTap: () {
                                                Navigator.pop(context);
                                                if (item.saleId != null &&
                                                    item.saleId!.isNotEmpty) {
                                                  Navigator.push(
                                                    this.context,
                                                    MaterialPageRoute(
                                                      builder: (_) =>
                                                          SaleDetailScreen(
                                                            saleId:
                                                                item.saleId!,
                                                          ),
                                                    ),
                                                  );
                                                } else {
                                                  Navigator.push(
                                                    this.context,
                                                    MaterialPageRoute(
                                                      builder: (_) =>
                                                          const SalesHistoryScreen(),
                                                    ),
                                                  );
                                                }
                                              },
                                              child: Text(
                                                item.actionLabel!,
                                                style: const TextStyle(
                                                  color: AppColors.primaryBlue,
                                                  fontWeight: FontWeight.w600,
                                                  fontSize: 13,
                                                ),
                                              ),
                                            ),
                                          ),
                                        const SizedBox(height: 4),
                                        Text(
                                          _timeAgo(item.createdAt),
                                          style: TextStyle(
                                            fontSize: 12,
                                            color: Colors.grey.shade600,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                ],
                              );
                            },
                          ),
                  ),
                ],
              ),
            );
          },
        );
      },
    );
  }

  void _openHeldCartsPanel() {
    Navigator.pop(context);
    showModalBottomSheet<void>(
      context: context,
      useSafeArea: true,
      isScrollControlled: true,
      builder: (BuildContext context) {
        return StatefulBuilder(
          builder: (BuildContext context, StateSetter modalSetState) {
            return SizedBox(
              height: MediaQuery.of(context).size.height * 0.72,
              child: Column(
                children: [
                  const Padding(
                    padding: EdgeInsets.fromLTRB(16, 14, 16, 10),
                    child: Row(
                      children: [
                        Expanded(
                          child: Text(
                            'Held Sales',
                            style: TextStyle(
                              fontSize: 19,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const Divider(height: 1),
                  Expanded(
                    child: _heldCarts.isEmpty
                        ? const Center(child: Text('No held sales yet'))
                        : ListView.builder(
                            itemCount: _heldCarts.length,
                            itemBuilder: (BuildContext context, int index) {
                              final HeldCart heldCart = _heldCarts[index];
                              double heldTotal = 0;
                              heldCart.items.forEach((String pid, int qty) {
                                final PosProduct? p = _productById(pid);
                                if (p != null) heldTotal += p.price * qty;
                              });
                              return ListTile(
                                title: Text(
                                  '${heldCart.id} - ${heldCart.label}',
                                ),
                                subtitle: Text(
                                  '${heldCart.items.length} items | GHS ${heldTotal.toStringAsFixed(2)} | ${_timeAgo(heldCart.heldAt)}',
                                ),
                                trailing: Wrap(
                                  spacing: 8,
                                  children: [
                                    TextButton(
                                      onPressed: () {
                                        setState(() {
                                          _cart
                                            ..clear()
                                            ..addAll(heldCart.items);
                                          _heldCarts.removeAt(index);
                                        });
                                        unawaited(_saveCurrentState());
                                        modalSetState(() {});
                                        Navigator.pop(context);
                                        _showSnack('Held sale resumed');
                                      },
                                      child: const Text('Resume'),
                                    ),
                                    TextButton(
                                      onPressed: () {
                                        setState(() {
                                          _heldCarts.removeAt(index);
                                        });
                                        unawaited(_saveCurrentState());
                                        modalSetState(() {});
                                        _showSnack('Held sale discarded');
                                      },
                                      child: const Text(
                                        'Discard',
                                        style: TextStyle(
                                          color: AppColors.dangerRed,
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                              );
                            },
                          ),
                  ),
                ],
              ),
            );
          },
        );
      },
    );
  }

  Widget _buildCashierDrawer() {
    return Drawer(
      child: SafeArea(
        child: Column(
          children: [
            Container(
              width: double.infinity,
              padding: const EdgeInsets.fromLTRB(16, 18, 16, 16),
              color: AppColors.disabledSurface,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Cashier Menu',
                    style: TextStyle(fontSize: 19, fontWeight: FontWeight.w800),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    widget.shiftSession.cashierName,
                    style: const TextStyle(color: AppColors.textSecondary),
                  ),
                ],
              ),
            ),
            ListTile(
              leading: const Icon(Icons.pause_circle_outline),
              title: const Text('Held Sales'),
              subtitle: Text('${_heldCarts.length} available'),
              onTap: _openHeldCartsPanel,
            ),
            ListTile(
              leading: const Icon(Icons.point_of_sale_outlined),
              title: const Text('Current Cart'),
              subtitle: Text('$_cartItemCount items'),
              onTap: () {
                Navigator.pop(context);
                _openCartScreen();
              },
            ),
            ListTile(
              leading: const Icon(Icons.receipt_long_outlined),
              title: const Text('My Sales History'),
              subtitle: const Text('View sales and request refunds'),
              onTap: () {
                Navigator.pop(context);
                Navigator.push(
                  context,
                  MaterialPageRoute(builder: (_) => const SalesHistoryScreen()),
                );
              },
            ),
            const Spacer(),
            Padding(
              padding: const EdgeInsets.all(16),
              child: SizedBox(
                width: double.infinity,
                child: OutlinedButton.icon(
                  onPressed: _openShiftCloseSummary,
                  icon: const Icon(Icons.logout_rounded),
                  label: const Text('Close Shift & Logout'),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  int get _unreadNotifications => _notificationService.unreadCount;

  IconData _notificationIcon(PosNotificationType type) {
    switch (type) {
      case PosNotificationType.info:
        return Icons.info_outline;
      case PosNotificationType.success:
        return Icons.check_circle_outline;
      case PosNotificationType.warning:
        return Icons.warning_amber_rounded;
      case PosNotificationType.error:
        return Icons.error_outline;
    }
  }

  Color _notificationColor(PosNotificationType type) {
    switch (type) {
      case PosNotificationType.info:
        return AppColors.primaryBlue;
      case PosNotificationType.success:
        return AppColors.successGreen;
      case PosNotificationType.warning:
        return AppColors.warningAmber;
      case PosNotificationType.error:
        return AppColors.dangerRed;
    }
  }

  String _timeAgo(DateTime dateTime) {
    final Duration diff = DateTime.now().difference(dateTime);
    if (diff.inDays > 0) return '${diff.inDays}d ago';
    if (diff.inHours > 0) return '${diff.inHours}h ago';
    if (diff.inMinutes > 0) return '${diff.inMinutes}m ago';
    return 'Just now';
  }

  void _showSnack(String message) {
    if (!mounted) return;
    ScaffoldMessenger.of(
      context,
    ).showSnackBar(SnackBar(content: Text(message)));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      key: _scaffoldKey,
      drawer: _buildCashierDrawer(),
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      bottomNavigationBar: _cart.isEmpty
          ? null
          : Container(
              margin: const EdgeInsets.all(16),
              padding: const EdgeInsets.fromLTRB(20, 16, 20, 16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(20),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.08),
                    blurRadius: 16,
                    offset: const Offset(0, 4),
                  ),
                ],
              ),
              child: Stack(
                alignment: Alignment.topCenter,
                clipBehavior: Clip.none,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Column(
                        mainAxisSize: MainAxisSize.min,
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              const Icon(
                                Icons.shopping_cart_outlined,
                                size: 22,
                                color: AppColors.accentBlue,
                              ),
                              const SizedBox(width: 8),
                              const Text(
                                'My Cart',
                                style: TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.w800,
                                  color: AppColors.textStrong,
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 4),
                          Text(
                            '$_cartItemCount items',
                            style: TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w500,
                              color: Colors.grey.shade600,
                            ),
                          ),
                        ],
                      ),
                      Text(
                        'GHS ${total.toStringAsFixed(2)}',
                        style: const TextStyle(
                          fontSize: 20,
                          fontWeight: FontWeight.w800,
                          color: AppColors.accentBlue,
                        ),
                      ),
                    ],
                  ),
                  Positioned(
                    top: 0,
                    left: 0,
                    right: 0,
                    child: Center(
                      child: Transform.translate(
                        offset: const Offset(0, -28),
                        child: GestureDetector(
                          onTap: _openCartScreen,
                          child: Container(
                            width: 56,
                            height: 56,
                            decoration: const BoxDecoration(
                              shape: BoxShape.circle,
                              gradient: LinearGradient(
                                begin: Alignment.topLeft,
                                end: Alignment.bottomRight,
                                colors: [
                                  AppColors.accentBlue,
                                  AppColors.accentBlueDark,
                                ],
                              ),
                              boxShadow: [
                                BoxShadow(
                                  color: AppColors.accentBlue,
                                  blurRadius: 12,
                                  spreadRadius: 2,
                                ),
                              ],
                            ),
                            child: const Icon(
                              Icons.expand_less_rounded,
                              color: Colors.white,
                              size: 28,
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
      body: SafeArea(
        child: Column(
          children: [
            TopBar(
              onMenuTap: _openMenu,
              onNotificationsTap: _openNotificationsPanel,
              unreadCount: _unreadNotifications,
            ),
            SearchBarWidget(
              controller: _searchController,
              onChanged: _onSearchChanged,
              onSubmitted: _onSearchSubmitted,
              onScanTap: _openScanner,
            ),
            const SectionHeader(),
            SizedBox(
              height: 42,
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
                itemCount: _categories.length,
                separatorBuilder: (_, a) => const SizedBox(width: 8),
                itemBuilder: (BuildContext context, int index) {
                  final String category = _categories[index];
                  final bool isSelected = category == _selectedCategory;
                  return FilterChipWidget(
                    label: category,
                    selected: isSelected,
                    onTap: () => setState(() => _selectedCategory = category),
                  );
                },
              ),
            ),
            const SizedBox(height: 4),
            Expanded(child: _buildProductGrid()),
          ],
        ),
      ),
    );
  }

  Widget _buildProductGrid() {
    if (_isLoading) {
      return const Center(child: CircularProgressIndicator());
    }

    if (_loadError != null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.cloud_off_rounded, size: 40, color: Colors.grey),
              const SizedBox(height: 12),
              const Text(
                'Failed to load products',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
              ),
              const SizedBox(height: 6),
              Text(
                _loadError!,
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
              ),
              const SizedBox(height: 16),
              ElevatedButton.icon(
                onPressed: _loadProducts,
                icon: const Icon(Icons.refresh),
                label: const Text('Retry'),
              ),
            ],
          ),
        ),
      );
    }

    final List<PosProduct> filtered = _filteredProducts;

    if (filtered.isEmpty) {
      return Center(
        child: Text(
          _searchQuery.trim().isEmpty
              ? 'No products available'
              : 'No products found for "${_searchQuery.trim()}"',
          style: TextStyle(
            color: Colors.grey.shade600,
            fontWeight: FontWeight.w600,
          ),
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: _loadProducts,
      child: GridView.builder(
        padding: const EdgeInsets.fromLTRB(16, 4, 16, 16),
        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
          crossAxisCount: 2,
          crossAxisSpacing: 12,
          mainAxisSpacing: 12,
          childAspectRatio: 0.82,
        ),
        itemCount: filtered.length,
        itemBuilder: (BuildContext context, int index) {
          final PosProduct item = filtered[index];
          return GestureDetector(
            onTap: () {
              if (!item.isInStock) {
                _showSnack('${item.name} is out of stock');
                return;
              }
              setState(() => _cart[item.id] = (_cart[item.id] ?? 0) + 1);
              unawaited(_saveCurrentState());
            },
            child: _ProductCard(item: item),
          );
        },
      ),
    );
  }
}

class _ProductCard extends StatelessWidget {
  const _ProductCard({required this.item});

  final PosProduct item;

  @override
  Widget build(BuildContext context) {
    final bool outOfStock = !item.isInStock;

    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.imagePlaceholderMuted),
        boxShadow: const [
          BoxShadow(
            color: AppColors.shadowSoft,
            blurRadius: 10,
            offset: Offset(0, 3),
          ),
        ],
      ),
      child: Column(
        children: [
          ClipRRect(
            borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
            child: Container(
              height: 140,
              width: double.infinity,
              decoration: BoxDecoration(
                color: outOfStock
                    ? AppColors.imagePlaceholderMuted
                    : AppColors.imagePlaceholder,
              ),
              child: item.imageUrl != null && item.imageUrl!.isNotEmpty
                  ? Image.network(
                      item.imageUrl!,
                      fit: BoxFit.cover,
                      errorBuilder: (_, e, st) => _placeholder(outOfStock),
                    )
                  : _placeholder(outOfStock),
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(10, 8, 10, 8),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  item.name,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    fontWeight: FontWeight.w700,
                    fontSize: 13,
                  ),
                ),
                const SizedBox(height: 4),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'GHS ${item.price.toStringAsFixed(2)}',
                      style: const TextStyle(
                        color: AppColors.primaryBlue,
                        fontWeight: FontWeight.w800,
                        fontSize: 13,
                      ),
                    ),
                    if (outOfStock)
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 6,
                          vertical: 2,
                        ),
                        decoration: BoxDecoration(
                          color: AppColors.tintRed,
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: const Text(
                          'Out of stock',
                          style: TextStyle(
                            fontSize: 10,
                            color: AppColors.dangerRed,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      )
                    else
                      Text(
                        '${item.stockQty} left',
                        style: const TextStyle(
                          fontSize: 11,
                          color: AppColors.textSecondary,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _placeholder(bool outOfStock) {
    return Icon(
      Icons.local_cafe_rounded,
      size: 34,
      color: outOfStock ? AppColors.textMuted : AppColors.primary,
    );
  }
}
