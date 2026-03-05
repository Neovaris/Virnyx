enum PaymentMethod { cash, momo, card }

extension PaymentMethodX on PaymentMethod {
  String get apiValue {
    switch (this) {
      case PaymentMethod.cash:
        return 'cash';
      case PaymentMethod.momo:
        return 'momo';
      case PaymentMethod.card:
        return 'card';
    }
  }

  String get label {
    switch (this) {
      case PaymentMethod.cash:
        return 'Cash';
      case PaymentMethod.momo:
        return 'MoMo';
      case PaymentMethod.card:
        return 'Card';
    }
  }

  static PaymentMethod fromApi(String v) {
    final s = v.trim().toLowerCase();
    if (s == 'momo') return PaymentMethod.momo;
    if (s == 'card') return PaymentMethod.card;
    return PaymentMethod.cash;
  }
}