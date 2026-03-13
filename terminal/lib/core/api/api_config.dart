class ApiConfig {
  /// Backend API base URL - centralized configuration
  /// Change for different environments:
  ///   - local dev: http://localhost:4000
  ///   - android emulator: http://10.0.2.2:4000
  ///   - staging: https://staging-api.virnyx.com
  ///   - production: https://api.virnyx.com
  static const baseUrl = 'http://localhost:4000';
}