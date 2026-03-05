import 'dart:convert';
import 'package:http/http.dart' as http;

class ApiException implements Exception {
  final int? statusCode;
  final String message;
  final dynamic body;
  ApiException(this.message, {this.statusCode, this.body});

  @override
  String toString() => 'ApiException($statusCode): $message';
}

class ApiClient {
  final String baseUrl;
  String? token;

  ApiClient({required this.baseUrl, this.token});

  Map<String, String> _headers({bool json = true}) {
    final h = <String, String>{};
    if (json) h['Content-Type'] = 'application/json';
    if (token != null && token!.isNotEmpty) h['Authorization'] = 'Bearer $token';
    return h;
  }

  Uri _u(String path, [Map<String, String>? q]) {
    final uri = Uri.parse('$baseUrl$path');
    return q == null ? uri : uri.replace(queryParameters: q);
  }

  Future<Map<String, dynamic>> getJson(String path, {Map<String, String>? query}) async {
    final res = await http.get(_u(path, query), headers: _headers());
    return _decode(res);
  }

  Future<Map<String, dynamic>> postJson(String path, {Map<String, dynamic>? body}) async {
    final res = await http.post(
      _u(path),
      headers: _headers(),
      body: jsonEncode(body ?? const {}),
    );
    return _decode(res);
  }

  Future<Map<String, dynamic>> putJson(String path, {Map<String, dynamic>? body}) async {
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
          : 'Request failed';
      throw ApiException(msg, statusCode: res.statusCode, body: data);
    }

    if (data is Map<String, dynamic>) return data;
    return {'data': data};
  }
}