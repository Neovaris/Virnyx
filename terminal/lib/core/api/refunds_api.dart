import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'api_client.dart';
import 'api_provider.dart';

/// Refunds API Service - handles refund-specific API calls
class RefundsApiService {
  final ApiClient _client;

  const RefundsApiService(this._client);

  /// Get a specific refund by ID
  Future<Map<String, dynamic>?> getRefund(String refundId) async {
    try {
      final response = await _client.getJson('/refunds/$refundId');
      return response?['refund'] ?? response;
    } catch (e) {
      print('Error fetching refund: $e');
      return null;
    }
  }
}

// Riverpod Provider for RefundsApiService
final refundsApiProvider = Provider<RefundsApiService>((ref) {
  final client = ref.read(apiProvider);
  return RefundsApiService(client);
});

// Poll a specific refund's status for approval changes
final refundStatusPollingProvider = FutureProvider.autoDispose
    .family<Map<String, dynamic>?, String>((ref, refundId) async {
  final api = ref.read(refundsApiProvider);
  return api.getRefund(refundId);
});
