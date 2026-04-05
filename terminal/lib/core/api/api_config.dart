import 'package:flutter/foundation.dart';

class ApiConfig {
  static const String _defaultLocal = 'http://localhost:4000';
  static const String _defaultProd = 'https://virnyx.onrender.com';

  static const String _envApiUrl = String.fromEnvironment(
    'API_URL',
    defaultValue: '',
  );

  static String get baseUrl {
    if (_envApiUrl.isNotEmpty) return _envApiUrl;
    return kReleaseMode ? _defaultProd : _defaultLocal;
  }

  static const String productionUrl = _defaultProd;
}
