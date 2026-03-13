enum PaymentMethod { cash, momo, card }

extension PaymentMethodX on PaymentMethod {
  String get apiValue {
    switch (this) {
      case PaymentMethod.cash:
        return 'CASH';
      case PaymentMethod.momo:
        return 'MOMO';
      case PaymentMethod.card:
        return 'CARD';
    }
  }

  String get label {
    switch (this) {
      case PaymentMethod.cash:
        return 'CASH';
      case PaymentMethod.momo:
        return 'MOMO';
      case PaymentMethod.card:
        return 'CARD';
    }
  }

  static PaymentMethod fromApi(String value) {
    switch (value.toUpperCase()) {
      case 'CASH':
        return PaymentMethod.cash;
      case 'MOMO':
        return PaymentMethod.momo;
      case 'CARD':
        return PaymentMethod.card;
      default:
        return PaymentMethod.cash;
    }
  }
}