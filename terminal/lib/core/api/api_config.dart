class ApiConfig {
  static const String _defaultLocal = 'http://10.0.2.2:4000';
  static const String _defaultProd = 'https://virnyx.onrender.com';

  static const String baseUrl = String.fromEnvironment(
    'API_URL',
    defaultValue: _defaultProd,
  );

  static const String productionUrl = _defaultProd;
}