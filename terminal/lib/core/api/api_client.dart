import 'dart:convert';
import 'package:http/http.dart' as http;
import 'dart:async';

class ApiException implements Exception {
  final int? statusCode;
  final String message;
  final dynamic body;
  final bool isNetworkError;
  final bool is4xx;
  final bool is5xx;
  final bool isTimeout;

  ApiException(
    this.message, {
    this.statusCode,
    this.body,
    this.isNetworkError = false,
    this.isTimeout = false,
  }) : is4xx = statusCode != null && statusCode >= 400 && statusCode < 500,
       is5xx = statusCode != null && statusCode >= 500;

  @override
  String toString() => 'ApiException($statusCode): $message';
}

class ApiClient {
  final String baseUrl;
  String? token;

  // Retry configuration
  static const int maxRetries = 3;
  static const Duration initialRetryDelay = Duration(milliseconds: 500);
  static const Duration timeout = Duration(seconds: 30);

  ApiClient({required this.baseUrl, this.token});

  Map<String, String> _headers({bool json = true}) {
    final h = <String, String>{};
    if (json) h['Content-Type'] = 'application/json';
    if (token != null && token!.isNotEmpty)
      h['Authorization'] = 'Bearer $token';
    return h;
  }

  Uri _u(String path, [Map<String, String>? q]) {
    final uri = Uri.parse('$baseUrl$path');
    return q == null ? uri : uri.replace(queryParameters: q);
  }

  /// Exponential backoff retry logic
  Future<T> _retry<T>(Future<T> Function() fn) async {
    int attempt = 0;
    while (attempt < maxRetries) {
      try {
        return await fn().timeout(timeout);
      } catch (e) {
        attempt++;
        if (attempt >= maxRetries) rethrow;

        // Only retry on network/timeout errors, not 4xx
        if (e is ApiException && (e.is4xx)) rethrow;

        // Exponential backoff: 500ms, 1s, 2s
        final delay = Duration(
          milliseconds: initialRetryDelay.inMilliseconds * (1 << (attempt - 1)),
        );
        await Future.delayed(delay);
      }
    }
    throw ApiException('Max retries exceeded');
  }

  Future<Map<String, dynamic>> getJson(
    String path, {
    Map<String, String>? query,
    bool noRetry = false,
  }) async {
    if (noRetry) {
      final res = await http
          .get(_u(path, query), headers: _headers())
          .timeout(timeout);
      return _decode(res);
    }

    return _retry(
      () => http.get(_u(path, query), headers: _headers()).then(_decode),
    );
  }

  Future<Map<String, dynamic>> postJson(
    String path, {
    Map<String, dynamic>? body,
    bool noRetry = false,
  }) async {
    if (noRetry) {
      final res = await http
          .post(
            _u(path),
            headers: _headers(),
            body: jsonEncode(body ?? const {}),
          )
          .timeout(timeout);
      return _decode(res);
    }

    return _retry(
      () => http
          .post(
            _u(path),
            headers: _headers(),
            body: jsonEncode(body ?? const {}),
          )
          .then(_decode),
    );
  }

  Future<Map<String, dynamic>> putJson(
    String path, {
    Map<String, dynamic>? body,
    bool noRetry = false,
  }) async {
    if (noRetry) {
      final res = await http
          .put(
            _u(path),
            headers: _headers(),
            body: jsonEncode(body ?? const {}),
          )
          .timeout(timeout);
      return _decode(res);
    }

    return _retry(
      () => http
          .put(
            _u(path),
            headers: _headers(),
            body: jsonEncode(body ?? const {}),
          )
          .then(_decode),
    );
  }

  Future<Map<String, dynamic>> patchJson(
    String path, {
    Map<String, dynamic>? body,
    bool noRetry = false,
  }) async {
    if (noRetry) {
      final res = await http
          .patch(
            _u(path),
            headers: _headers(),
            body: jsonEncode(body ?? const {}),
          )
          .timeout(timeout);
      return _decode(res);
    }

    return _retry(
      () => http
          .patch(
            _u(path),
            headers: _headers(),
            body: jsonEncode(body ?? const {}),
          )
          .then(_decode),
    );
  }

  Future<Map<String, dynamic>> deleteJson(
    String path, {
    bool noRetry = false,
  }) async {
    if (noRetry) {
      final res = await http
          .delete(_u(path), headers: _headers())
          .timeout(timeout);
      return _decode(res);
    }

    return _retry(
      () => http.delete(_u(path), headers: _headers()).then(_decode),
    );
  }

  // Legacy method compatibility
  Future<Map<String, dynamic>> putJson_legacy(
    String path, {
    Map<String, dynamic>? body,
  }) async {
    final res = await http.put(
      _u(path),
      headers: _headers(),
      body: jsonEncode(body ?? const {}),
    );
    return _decode(res);
  }

  Map<String, dynamic> _decode(http.Response res) {
    final txt = res.body;
    dynamic data;
    try {
      data = txt.isEmpty ? null : jsonDecode(txt);
    } catch (_) {
      data = txt;
    }

    if (res.statusCode < 200 || res.statusCode >= 300) {
      final msg = (data is Map && data['message'] != null)
          ? data['message'].toString()
          : 'Request failed (${res.statusCode})';
      throw ApiException(msg, statusCode: res.statusCode, body: data);
    }

    if (data is Map<String, dynamic>) return data;
    return {'data': data};
  }
}
