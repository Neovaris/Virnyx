import '../sales/history/sales_models.dart';
import '../../core/api/settings_api.dart';

abstract class ReceiptPrinter {
  Future<void> printSale(Sale sale, {ReceiptSettings? settings});
}
