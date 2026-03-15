// lib/features/receipt/receipt_print_service.dart
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/offline/offline_db.dart';
import '../../core/offline/offline_queue_models.dart';
import '../sales/history/sales_models.dart';
import 'receipt_printer_provider.dart';

final receiptPrintServiceProvider =
    NotifierProvider<ReceiptPrintService, ReceiptPrintState>(
  ReceiptPrintService.new,
);

class ReceiptPrintState {
  final bool printing;
  final bool? lastPrintSuccess;
  final String? lastPrintError;
  final int queuedReceipts;

  const ReceiptPrintState({
    required this.printing,
    this.lastPrintSuccess,
    this.lastPrintError,
    this.queuedReceipts = 0,
  });

  const ReceiptPrintState.initial()
      : printing = false,
        lastPrintSuccess = null,
        lastPrintError = null,
        queuedReceipts = 0;

  ReceiptPrintState copyWith({
    bool? printing,
    bool? lastPrintSuccess,
    String? lastPrintError,
    int? queuedReceipts,
    bool clearError = false,
  }) {
    return ReceiptPrintState(
      printing: printing ?? this.printing,
      lastPrintSuccess:
          lastPrintSuccess ?? (clearError ? null : this.lastPrintSuccess),
      lastPrintError:
          clearError ? null : (lastPrintError ?? this.lastPrintError),
      queuedReceipts: queuedReceipts ?? this.queuedReceipts,
    );
  }
}

class ReceiptPrintService extends Notifier<ReceiptPrintState> {
  late final OfflineDb _db;

  @override
  ReceiptPrintState build() {
    _db = OfflineDb();
    _checkQueuedReceipts();
    return const ReceiptPrintState.initial();
  }

  Future<void> _checkQueuedReceipts() async {
    final queue = await _db.getReceiptsQueue();
    state = state.copyWith(queuedReceipts: queue.length);
  }

  Future<bool> printSale(Sale sale) async {
    state = state.copyWith(printing: true, clearError: true);

    try {
      await ref.read(receiptPrinterProvider).printSale(sale);

      state = state.copyWith(
        printing: false,
        lastPrintSuccess: true,
        clearError: true,
      );
      debugPrint('[ReceiptPrint] ✅ Printed ${sale.id}');
      return true;
    } catch (e) {
      debugPrint('[ReceiptPrint] ❌ Failed: $e');

      // Queue for later printing
      final receipt = QueuedReceipt(
        id: '${sale.id}-print-${DateTime.now().millisecondsSinceEpoch}',
        saleId: sale.id,
        saleData: {
          'id': sale.id,
          'receiptNo': sale.receiptNo,
          'createdAt': sale.createdAt.toIso8601String(),
          'method': sale.method.name,
          'subtotal': sale.subtotal,
          'tax': sale.tax,
          'total': sale.total,
          'tendered': sale.tendered,
          'change': sale.change,
          'reference': sale.reference,
          'shiftId': sale.shiftId,
          'storeId': sale.storeId,
          'lines': sale.lines
              .map((l) => {
                    'productId': l.productId,
                    'name': l.name,
                    'unitPrice': l.unitPrice,
                    'qty': l.qty,
                  })
              .toList(),
        },
        queuedAt: DateTime.now(),
        lastError: e.toString(),
      );

      await _db.queueReceipt(receipt);
      await _checkQueuedReceipts();

      state = state.copyWith(
        printing: false,
        lastPrintSuccess: false,
        lastPrintError: e.toString(),
      );

      rethrow;
    }
  }

  Future<void> retryPrintQueue() async {
    state = state.copyWith(printing: true, clearError: true);

    try {
      final queue = await _db.getReceiptsQueue();
      List<QueuedReceipt> printed = [];

      for (final receipt in queue) {
        if (receipt.printed) continue;

        try {
          // Convert queued data back to Sale
          final saleData = Map<String, dynamic>.from(receipt.saleData);
          final sale = Sale.fromJson(saleData);

          await ref.read(receiptPrinterProvider).printSale(sale);

          final updated = receipt.copyWith(
            printed: true,
            printAttempts: receipt.printAttempts + 1,
          );
          await _db.updateReceipt(updated);
          printed.add(updated);

          debugPrint('[ReceiptPrint] ✅ Retry printed ${receipt.saleId}');
        } catch (e) {
          final updated = receipt.copyWith(
            lastError: e.toString(),
            printAttempts: receipt.printAttempts + 1,
          );
          await _db.updateReceipt(updated);
          debugPrint('[ReceiptPrint] ❌ Retry failed: $e');
        }
      }

      // Clean up printed
      await _db.clearPrintedReceipts();
      await _checkQueuedReceipts();

      state = state.copyWith(
        printing: false,
        lastPrintSuccess: printed.isNotEmpty,
        clearError: true,
      );
    } catch (e) {
      state = state.copyWith(
        printing: false,
        lastPrintSuccess: false,
        lastPrintError: e.toString(),
      );
      rethrow;
    }
  }
}
