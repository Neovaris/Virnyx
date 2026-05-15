import 'package:flutter/foundation.dart';

import 'api_client.dart';
import 'connectivity_service.dart';
import 'offline_sync_service.dart';

/// Wrapper around ApiClient that adds offline-first capabilities.
/// Handles queuing operations when offline and syncing when online.
class OfflineAwareApiClient {
  OfflineAwareApiClient._();

  static final OfflineAwareApiClient instance = OfflineAwareApiClient._();

  final ApiClient _api = ApiClient.instance;
  final ConnectivityService _connectivity = ConnectivityService.instance;
  final OfflineSyncService _sync = OfflineSyncService.instance;

  /// POST request with offline support
  Future<Map<String, dynamic>> postJson(
    String path,
    Map<String, dynamic> body, {
    bool queueIfOffline = true,
    String? operationName,
  }) async {
    if (_connectivity.isOffline && queueIfOffline) {
      // Queue operation for later sync
      await _sync.queueOperation(
        operation: operationName ?? 'POST',
        endpoint: path,
        method: 'POST',
        payload: body,
      );

      throw ApiException(
        'Currently offline. Your request will be synced when online.',
        isOffline: true,
      );
    }

    try {
      return await _api.postJson(path, body);
    } catch (e) {
      rethrow;
    }
  }

  /// PUT request with offline support
  Future<Map<String, dynamic>> putJson(
    String path,
    Map<String, dynamic> body, {
    bool queueIfOffline = true,
    String? operationName,
  }) async {
    if (_connectivity.isOffline && queueIfOffline) {
      await _sync.queueOperation(
        operation: operationName ?? 'PUT',
        endpoint: path,
        method: 'PUT',
        payload: body,
      );

      throw ApiException(
        'Currently offline. Your request will be synced when online.',
        isOffline: true,
      );
    }

    try {
      return await _api.putJson(path, body);
    } catch (e) {
      rethrow;
    }
  }

  /// DELETE request with offline support
  Future<Map<String, dynamic>> deleteJson(
    String path, {
    bool queueIfOffline = true,
    String? operationName,
  }) async {
    if (_connectivity.isOffline && queueIfOffline) {
      await _sync.queueOperation(
        operation: operationName ?? 'DELETE',
        endpoint: path,
        method: 'DELETE',
        payload: <String, dynamic>{},
      );

      throw ApiException(
        'Currently offline. Your request will be synced when online.',
        isOffline: true,
      );
    }

    try {
      return await _api.deleteJson(path);
    } catch (e) {
      rethrow;
    }
  }

  /// GET request (not queued, tries to use cache if offline)
  Future<Map<String, dynamic>> getJson(String path) async {
    try {
      return await _api.getJson(path);
    } catch (e) {
      if (_connectivity.isOffline) {
        // Could implement cache lookup here for read operations
        debugPrint('[OfflineAwareApiClient] Offline GET failed: $path');
      }
      rethrow;
    }
  }

  /// Manually trigger sync
  Future<void> syncPending() => _sync.syncNow();

  bool get isOnline => _connectivity.isOnline;
  bool get isOffline => _connectivity.isOffline;
  int get pendingOperations => _sync.pendingOperations;
}
