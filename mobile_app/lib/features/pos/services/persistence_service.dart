import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';

import 'notification_service.dart';

/// Service for persisting cart, held carts, and notifications to local storage.
/// Survives app restarts and crashes.
class PersistenceService {
  static const String _cartKey = 'pos_cart';
  static const String _heldCartsKey = 'pos_held_carts';
  static const String _notificationsKey = 'pos_notifications';
  static const String _selectedCategoryKey = 'pos_selected_category';

  static SharedPreferences? _prefs;

  static Future<SharedPreferences> _ensurePrefs() async {
    _prefs ??= await SharedPreferences.getInstance();
    return _prefs!;
  }

  /// Initialize the persistence service (call once at app startup)
  static Future<void> initialize() async {
    await _ensurePrefs();
  }

  /// Save the current cart (productId to quantity)
  static Future<bool> saveCart(Map<String, int> cart) async {
    try {
      final SharedPreferences prefs = await _ensurePrefs();
      final String encoded = jsonEncode(cart);
      return await prefs.setString(_cartKey, encoded);
    } catch (e) {
      debugLog('Failed to save cart: $e');
      return false;
    }
  }

  /// Load the saved cart
  static Future<Map<String, int>> restoreCart() async {
    try {
      final SharedPreferences prefs = await _ensurePrefs();
      final String? encoded = prefs.getString(_cartKey);
      if (encoded == null) return <String, int>{};
      final dynamic decoded = jsonDecode(encoded);
      if (decoded is! Map) return <String, int>{};
      return Map<String, int>.from(
        decoded.map(
          (key, value) => MapEntry<String, int>(
            key.toString(),
            (value as num?)?.toInt() ?? 0,
          ),
        ),
      );
    } catch (e) {
      debugLog('Failed to restore cart: $e');
      return <String, int>{};
    }
  }

  /// Clear the saved cart
  static Future<bool> clearCart() async {
    try {
      final SharedPreferences prefs = await _ensurePrefs();
      return await prefs.remove(_cartKey);
    } catch (e) {
      debugLog('Failed to clear cart: $e');
      return false;
    }
  }

  /// Save held carts (List of {id, label, items, heldAt})
  static Future<bool> saveHeldCarts(
    List<Map<String, dynamic>> heldCarts,
  ) async {
    try {
      final SharedPreferences prefs = await _ensurePrefs();
      final String encoded = jsonEncode(heldCarts);
      return await prefs.setString(_heldCartsKey, encoded);
    } catch (e) {
      debugLog('Failed to save held carts: $e');
      return false;
    }
  }

  /// Load saved held carts
  static Future<List<Map<String, dynamic>>> restoreHeldCarts() async {
    try {
      final SharedPreferences prefs = await _ensurePrefs();
      final String? encoded = prefs.getString(_heldCartsKey);
      if (encoded == null) return <Map<String, dynamic>>[];
      final dynamic decoded = jsonDecode(encoded);
      if (decoded is! List) return <Map<String, dynamic>>[];
      return decoded
          .map(
            (item) => Map<String, dynamic>.from(
              (item as Map).cast<String, dynamic>(),
            ),
          )
          .toList();
    } catch (e) {
      debugLog('Failed to restore held carts: $e');
      return <Map<String, dynamic>>[];
    }
  }

  /// Clear saved held carts
  static Future<bool> clearHeldCarts() async {
    try {
      final SharedPreferences prefs = await _ensurePrefs();
      return await prefs.remove(_heldCartsKey);
    } catch (e) {
      debugLog('Failed to clear held carts: $e');
      return false;
    }
  }

  /// Save notifications
  static Future<bool> saveNotifications(
    List<PosNotificationItem> notifications,
  ) async {
    try {
      final SharedPreferences prefs = await _ensurePrefs();
      final List<Map<String, dynamic>> serialized = notifications
          .map((PosNotificationItem n) => n.toJson())
          .toList();
      final String encoded = jsonEncode(serialized);
      return await prefs.setString(_notificationsKey, encoded);
    } catch (e) {
      debugLog('Failed to save notifications: $e');
      return false;
    }
  }

  /// Load saved notifications
  static Future<List<PosNotificationItem>> restoreNotifications() async {
    try {
      final SharedPreferences prefs = await _ensurePrefs();
      final String? encoded = prefs.getString(_notificationsKey);
      if (encoded == null) return <PosNotificationItem>[];
      final dynamic decoded = jsonDecode(encoded);
      if (decoded is! List) return <PosNotificationItem>[];
      return decoded
          .map(
            (item) => PosNotificationItem.fromJson(
              Map<String, dynamic>.from((item as Map).cast<String, dynamic>()),
            ),
          )
          .toList();
    } catch (e) {
      debugLog('Failed to restore notifications: $e');
      return <PosNotificationItem>[];
    }
  }

  /// Clear saved notifications
  static Future<bool> clearNotifications() async {
    try {
      final SharedPreferences prefs = await _ensurePrefs();
      return await prefs.remove(_notificationsKey);
    } catch (e) {
      debugLog('Failed to clear notifications: $e');
      return false;
    }
  }

  /// Save selected category for UX continuity
  static Future<bool> saveSelectedCategory(String category) async {
    try {
      final SharedPreferences prefs = await _ensurePrefs();
      return await prefs.setString(_selectedCategoryKey, category);
    } catch (e) {
      debugLog('Failed to save selected category: $e');
      return false;
    }
  }

  /// Restore selected category
  static Future<String> restoreSelectedCategory() async {
    try {
      final SharedPreferences prefs = await _ensurePrefs();
      return prefs.getString(_selectedCategoryKey) ?? 'ALL ITEMS';
    } catch (e) {
      debugLog('Failed to restore selected category: $e');
      return 'ALL ITEMS';
    }
  }

  /// Clear all POS data (useful for logout)
  static Future<bool> clearAll() async {
    try {
      final SharedPreferences prefs = await _ensurePrefs();
      await clearCart();
      await clearHeldCarts();
      await clearNotifications();
      await prefs.remove(_selectedCategoryKey);
      return true;
    } catch (e) {
      debugLog('Failed to clear all data: $e');
      return false;
    }
  }

  /// Debug logging (silent in production)
  static void debugLog(String message) {
    // ignore: avoid_print
    print('[PersistenceService] $message');
  }
}
