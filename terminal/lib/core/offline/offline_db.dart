// lib/core/offline/offline_db.dart
import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import 'offline_queue_models.dart';

class OfflineDb {
  static const String _salesQueueKey = 'vrx_offline_sales_queue';
  static const String _receiptsQueueKey = 'vrx_offline_receipts_queue';

  Future<void> queueSale(QueuedSale sale) async {
    final prefs = await SharedPreferences.getInstance();
    final queue = await getSalesQueue();
    queue.add(sale);
    
    final json = queue.map((s) => jsonEncode(s.toJson())).toList();
    await prefs.setStringList(_salesQueueKey, json);
  }

  Future<List<QueuedSale>> getSalesQueue() async {
    final prefs = await SharedPreferences.getInstance();
    final jsonList = prefs.getStringList(_salesQueueKey) ?? [];
    
    return jsonList
        .map((s) {
          try {
            final map = jsonDecode(s) as Map<String, dynamic>;
            return QueuedSale.fromJson(map);
          } catch (_) {
            return null;
          }
        })
        .whereType<QueuedSale>()
        .toList();
  }

  Future<void> updateSale(QueuedSale sale) async {
    final prefs = await SharedPreferences.getInstance();
    final queue = await getSalesQueue();
    final index = queue.indexWhere((s) => s.id == sale.id);
    
    if (index >= 0) {
      queue[index] = sale;
      final json = queue.map((s) => jsonEncode(s.toJson())).toList();
      await prefs.setStringList(_salesQueueKey, json);
    }
  }

  Future<void> removeSale(String saleId) async {
    final prefs = await SharedPreferences.getInstance();
    final queue = await getSalesQueue();
    queue.removeWhere((s) => s.id == saleId);
    
    final json = queue.map((s) => jsonEncode(s.toJson())).toList();
    await prefs.setStringList(_salesQueueKey, json);
  }

  Future<void> clearSyncedSales() async {
    final prefs = await SharedPreferences.getInstance();
    final queue = await getSalesQueue();
    queue.removeWhere((s) => s.synced);
    
    final json = queue.map((s) => jsonEncode(s.toJson())).toList();
    await prefs.setStringList(_salesQueueKey, json);
  }

  // Receipt queue management
  Future<void> queueReceipt(QueuedReceipt receipt) async {
    final prefs = await SharedPreferences.getInstance();
    final queue = await getReceiptsQueue();
    queue.add(receipt);
    
    final json = queue.map((r) => jsonEncode(r.toJson())).toList();
    await prefs.setStringList(_receiptsQueueKey, json);
  }

  Future<List<QueuedReceipt>> getReceiptsQueue() async {
    final prefs = await SharedPreferences.getInstance();
    final jsonList = prefs.getStringList(_receiptsQueueKey) ?? [];
    
    return jsonList
        .map((r) {
          try {
            final map = jsonDecode(r) as Map<String, dynamic>;
            return QueuedReceipt.fromJson(map);
          } catch (_) {
            return null;
          }
        })
        .whereType<QueuedReceipt>()
        .toList();
  }

  Future<void> updateReceipt(QueuedReceipt receipt) async {
    final prefs = await SharedPreferences.getInstance();
    final queue = await getReceiptsQueue();
    final index = queue.indexWhere((r) => r.id == receipt.id);
    
    if (index >= 0) {
      queue[index] = receipt;
      final json = queue.map((r) => jsonEncode(r.toJson())).toList();
      await prefs.setStringList(_receiptsQueueKey, json);
    }
  }

  Future<void> removeReceipt(String receiptId) async {
    final prefs = await SharedPreferences.getInstance();
    final queue = await getReceiptsQueue();
    queue.removeWhere((r) => r.id == receiptId);
    
    final json = queue.map((r) => jsonEncode(r.toJson())).toList();
    await prefs.setStringList(_receiptsQueueKey, json);
  }

  Future<void> clearPrintedReceipts() async {
    final prefs = await SharedPreferences.getInstance();
    final queue = await getReceiptsQueue();
    queue.removeWhere((r) => r.printed);
    
    final json = queue.map((r) => jsonEncode(r.toJson())).toList();
    await prefs.setStringList(_receiptsQueueKey, json);
  }
}
