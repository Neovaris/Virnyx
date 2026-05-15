import 'dart:convert';

import 'package:http/http.dart' as http;

class ApiException implements Exception {
  ApiException(
    this.message, {
    this.statusCode,
    this.body,
    this.isOffline = false,
  });

  final String message;
  final int? statusCode;
  final dynamic body;
  final bool isOffline;

  @override
  String toString() {
    if (isOffline) return 'ApiException(OFFLINE): $message';
    return 'ApiException($statusCode): $message';
  }
}

class ApiClient {
  ApiClient._();

  static final ApiClient instance = ApiClient._();

  static const String _defaultBaseUrl = 'http://10.0.2.2:4000';
  static const String _baseUrlFromDefine = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: _defaultBaseUrl,
  );

  String? _token;
  bool _enableOfflineMode = true;

  Uri _url(String path) {
    final String normalizedPath = path.startsWith('/') ? path : '/$path';
    return Uri.parse('$_baseUrlFromDefine$normalizedPath');
  }

  void setToken(String? token) {
    _token = token;
  }

  void setOfflineMode(bool enabled) {
    _enableOfflineMode = enabled;
  }

  Future<Map<String, dynamic>> getJson(String path) async {
    final http.Response response = await http.get(
      _url(path),
      headers: _headers(),
    );
    return _decode(response);
  }

  Future<Map<String, dynamic>> postJson(
    String path,
    Map<String, dynamic> body, {
    bool queueIfOffline = true,
    String? operationName,
  }) async {
    // Check offline-first mode
    if (_enableOfflineMode && queueIfOffline) {
      // Lazy import to avoid circular dependency
      // ignore: implementation_imports
      try {
        // Try to get connectivity service without circular import
        final dynamic connectivityModule = await _loadConnectivity();
        if (connectivityModule != null && !connectivityModule.isOnline) {
          // Queue operation for later sync
          await _queueOperation(
            operation: operationName ?? 'unknown',
            endpoint: path,
            method: 'POST',
            payload: body,
          );
          throw ApiException(
            'Operation queued for sync when online',
            isOffline: true,
          );
        }
      } catch (e) {
        if (e is ApiException && e.isOffline) rethrow;
        // If connectivity check fails, continue with normal request
      }
    }

    final http.Response response = await http.post(
      _url(path),
      headers: _headers(),
      body: jsonEncode(body),
    );
    return _decode(response);
  }

  Future<Map<String, dynamic>> putJson(
    String path,
    Map<String, dynamic> body, {
    bool queueIfOffline = true,
    String? operationName,
  }) async {
    // Check offline-first mode
    if (_enableOfflineMode && queueIfOffline) {
      try {
        final dynamic connectivityModule = await _loadConnectivity();
        if (connectivityModule != null && !connectivityModule.isOnline) {
          await _queueOperation(
            operation: operationName ?? 'unknown',
            endpoint: path,
            method: 'PUT',
            payload: body,
          );
          throw ApiException(
            'Operation queued for sync when online',
            isOffline: true,
          );
        }
      } catch (e) {
        if (e is ApiException && e.isOffline) rethrow;
      }
    }

    final http.Response response = await http.put(
      _url(path),
      headers: _headers(),
      body: jsonEncode(body),
    );
    return _decode(response);
  }

  Future<Map<String, dynamic>> deleteJson(
    String path, {
    bool queueIfOffline = true,
    String? operationName,
  }) async {
    // Check offline-first mode
    if (_enableOfflineMode && queueIfOffline) {
      try {
        final dynamic connectivityModule = await _loadConnectivity();
        if (connectivityModule != null && !connectivityModule.isOnline) {
          await _queueOperation(
            operation: operationName ?? 'unknown',
            endpoint: path,
            method: 'DELETE',
            payload: <String, dynamic>{},
          );
          throw ApiException(
            'Operation queued for sync when online',
            isOffline: true,
          );
        }
      } catch (e) {
        if (e is ApiException && e.isOffline) rethrow;
      }
    }

    final http.Response response = await http.delete(
      _url(path),
      headers: _headers(),
    );
    return _decode(response);
  }

  /// Load connectivity service (lazy to avoid circular imports)
  Future<dynamic> _loadConnectivity() async {
    try {
      // This will be available after initialization
      // Placeholder for actual implementation
      return null;
    } catch (e) {
      return null;
    }
  }

  Future<void> _queueOperation({
    required String operation,
    required String endpoint,
    required String method,
    required Map<String, dynamic> payload,
  }) async {
    try {
      // This will be called by OfflineSyncService
      // For now, just log it
      // ignore: avoid_print
      print('[ApiClient] Would queue: $operation -> $endpoint ($method)');
    } catch (e) {
      // Silently fail queue operations
    }
  }

  Map<String, String> _headers() {
    final Map<String, String> headers = <String, String>{
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    if (_token != null && _token!.isNotEmpty) {
      headers['Authorization'] = 'Bearer $_token';
    }

    return headers;
  }

  Map<String, dynamic> _decode(http.Response response) {
    final dynamic decoded = response.body.isEmpty
        ? <String, dynamic>{}
        : jsonDecode(response.body);

    if (response.statusCode < 200 || response.statusCode >= 300) {
      final String message = decoded is Map<String, dynamic>
          ? (decoded['message'] ?? 'Request failed').toString()
          : 'Request failed';
      throw ApiException(
        message,
        statusCode: response.statusCode,
        body: decoded,
      );
    }

    if (decoded is Map<String, dynamic>) {
      return decoded;
    }

    throw ApiException(
      'Invalid response format',
      statusCode: response.statusCode,
      body: decoded,
    );
  }
}
