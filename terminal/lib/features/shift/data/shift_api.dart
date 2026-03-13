import 'dart:convert';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:http/http.dart' as http;

import '../../core/api/api_config.dart';
import '../../auth/providers/auth_provider.dart';

final shiftApiProvider = Provider<ShiftApi>((ref) => ShiftApi(ref));

class OpenedShift {
  final String id;
  final double openingCash;
  final DateTime? openedAt;

  const OpenedShift({
    required this.id,
    required this.openingCash,
    required this.openedAt,
  });

  factory OpenedShift.fromJson(Map<String, dynamic> j) {
    return OpenedShift(
      id: (j['id'] ?? '').toString(),
      openingCash: (j['openingCash'] as num?)?.toDouble() ?? 0,
      openedAt: j['openedAt'] == null
          ? null
          : DateTime.tryParse(j['openedAt'].toString()),
    );
  }
}

class ShiftApi {
  final Ref ref;

  ShiftApi(this.ref);

  Map<String, String> _headers() {
    final auth = ref.read(authProvider);
    final token = auth.token;

    if (token == null || token.isEmpty) {
      throw Exception('Missing auth token');
    }

    return {
      'Authorization': 'Bearer $token',
      'Content-Type': 'application/json',
    };
  }

  Future<OpenedShift> openShift({required double openingCash}) async {
final uri = Uri.parse('${ApiConfig.baseUrl}/sessions/open');

    final body = {
      'openingCash': openingCash,
    };

    final res = await http.post(
      uri,
      headers: _headers(),
      body: jsonEncode(body),
    );

    if (res.statusCode < 200 || res.statusCode >= 300) {
      throw Exception('Open shift failed: ${res.statusCode} ${res.body}');
    }

    final decoded = jsonDecode(res.body);
    if (decoded is Map<String, dynamic>) {
      final sessionJson = decoded['session'] ?? decoded;
      if (sessionJson is Map<String, dynamic>) {
        return OpenedShift.fromJson(sessionJson);
      }
    }

    throw Exception('Unexpected open shift response');
  }

  Future<OpenedShift?> getActiveShift() async {
final uri = Uri.parse('${ApiConfig.baseUrl}/sessions/active');

    final res = await http.get(uri, headers: _headers());

    if (res.statusCode < 200 || res.statusCode >= 300) {
      throw Exception(
        'Active shift fetch failed: ${res.statusCode} ${res.body}',
      );
    }

    final decoded = jsonDecode(res.body);
    if (decoded is Map<String, dynamic>) {
      final sessionJson = decoded['session'];
      if (sessionJson == null) return null;

      if (sessionJson is Map<String, dynamic>) {
        return OpenedShift.fromJson(sessionJson);
      }
    }

    throw Exception('Unexpected active shift response');
  }

  Future<void> closeShift({
    required String sessionId,
    required double closingCash,
    String? note,
  }) async {
final uri = Uri.parse('${ApiConfig.baseUrl}/sessions/$sessionId/close');

    final body = {
      'closingCash': closingCash,
      if (note != null && note.trim().isNotEmpty) 'note': note.trim(),
    };

    final res = await http.post(
      uri,
      headers: _headers(),
      body: jsonEncode(body),
    );

    if (res.statusCode < 200 || res.statusCode >= 300) {
      throw Exception('Close shift failed: ${res.statusCode} ${res.body}');
    }
  }
}