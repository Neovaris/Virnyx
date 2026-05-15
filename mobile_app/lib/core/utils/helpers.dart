import 'package:intl/intl.dart';

class Helpers {
  static final _currency = NumberFormat.currency(
    locale: 'en_GH',
    symbol: 'GHS ',
  );

  static String formatCurrency(double value) {
    return _currency.format(value);
  }

  static String formatDate(DateTime date) {
    return DateFormat('dd MMM yyyy, HH:mm').format(date);
  }

  static bool isValidBarcode(String value) {
    return value.length >= 8; // simple baseline
  }
}
