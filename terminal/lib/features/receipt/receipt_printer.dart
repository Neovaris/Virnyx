import '../sales/history/sales_models.dart';

abstract class ReceiptPrinter {
  Future<void> printSale(Sale sale);
}