import 'dart:async';
import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'api_client.dart';
import 'connectivity_service.dart';
import 'local_cache_service.dart';

/// Service to manage offline operations and sync them when online.
/// Handles retry logic, conflict resolution, and sync status.
class OfflineSyncService extends ChangeNotifier {
  OfflineSyncService._();

  static final OfflineSyncService instance = OfflineSyncService._();

  final LocalCacheService _cache = LocalCacheService.instance;
  final ConnectivityService _connectivity = ConnectivityService.instance;
  final ApiClient _api = ApiClient.instance;

  Timer? _syncTimer;
  bool _isSyncing = false;
  int _pendingOperations = 0;
  final List<String> _failedOperations = <String>[];

  bool get isSyncing => _isSyncing;
  int get pendingOperations => _pendingOperations;
  List<String> get failedOperations =>
      List<String>.unmodifiable(_failedOperations);
  bool get hasPendingWork => _pendingOperations > 0;

  /// Initialize sync monitoring
  void initialize() {
    // Listen to connectivity changes
    _connectivity.addListener(_onConnectivityChanged);

    // Start periodic sync check
    _syncTimer = Timer.periodic(const Duration(seconds: 30), (_) {
      _checkAndSync();
    });

    // Initial pending operations count
    _updatePendingCount();

    debugPrint('[OfflineSyncService] Initialized');
  }

  Future<void> _onConnectivityChanged() async {
    if (_connectivity.isOnline) {
      debugPrint('[OfflineSyncService] Back online - syncing immediately');
      await syncNow();
    }
  }

  /// Update count of pending operations
  Future<void> _updatePendingCount() async {
    final List<Map<String, dynamic>> operations = await _cache
        .getPendingOperations();
    _pendingOperations = operations.length;
    notifyListeners();
  }

  /// Check if sync is needed and perform it
  Future<void> _checkAndSync() async {
    if (!_connectivity.isOnline || _isSyncing) {
      return;
    }
    await syncNow();
  }

  /// Manually trigger a sync
  Future<void> syncNow() async {
    if (_isSyncing) return;
    if (!_connectivity.isOnline) {
      debugPrint('[OfflineSyncService] Cannot sync: offline');
      return;
    }

    _isSyncing = true;
    notifyListeners();

    try {
      final List<Map<String, dynamic>> operations = await _cache
          .getPendingOperations();

      debugPrint(
        '[OfflineSyncService] Syncing ${operations.length} operations',
      );

      for (final Map<String, dynamic> op in operations) {
        await _syncOperation(op);
      }

      // Clear failed list on successful complete sync
      if (operations.isNotEmpty) {
        _failedOperations.clear();
      }

      await _updatePendingCount();
    } catch (e) {
      debugPrint('[OfflineSyncService] Sync error: $e');
    } finally {
      _isSyncing = false;
      notifyListeners();
    }
  }

  /// Sync a single operation
  Future<void> _syncOperation(Map<String, dynamic> op) async {
    final String operationId = op['id'] as String;
    final String method = op['method'] as String;
    final String endpoint = op['endpoint'] as String;
    final String payloadStr = op['payload'] as String;
    final int retries = op['retries'] as int;
    final int maxRetries = op['maxRetries'] as int;

    try {
      final Map<String, dynamic> payload =
          jsonDecode(payloadStr) as Map<String, dynamic>;

      // Execute the operation
      switch (method.toUpperCase()) {
        case 'POST':
          await _api.postJson(endpoint, payload);
          break;
        case 'PUT':
          await _api.putJson(endpoint, payload);
          break;
        case 'DELETE':
          await _api.deleteJson(endpoint);
          break;
        default:
          debugPrint('[OfflineSyncService] Unknown method: $method');
          return;
      }

      // Mark as synced
      await _cache.markOperationSynced(operationId);
      debugPrint(
        '[OfflineSyncService] Synced operation: ${op['operation']} ($endpoint)',
      );
    } catch (e) {
      await _cache.incrementOperationRetry(operationId);
      debugPrint(
        '[OfflineSyncService] Failed to sync (attempt ${retries + 1}/$maxRetries): $e',
      );

      if (retries + 1 >= maxRetries) {
        _failedOperations.add(operationId);
        debugPrint(
          '[OfflineSyncService] Max retries reached for: $operationId',
        );
      }
    }
  }

  /// Queue an operation for later sync (called by services when offline)
  Future<void> queueOperation({
    required String operation,
    required String endpoint,
    required String method,
    required Map<String, dynamic> payload,
  }) async {
    await _cache.queueOperation(
      operation: operation,
      endpoint: endpoint,
      method: method,
      payload: payload,
    );
    await _updatePendingCount();
  }

  /// Cleanup resources
  @override
  void dispose() {
    _syncTimer?.cancel();
    _connectivity.removeListener(_onConnectivityChanged);
    super.dispose();
  }

  @override
  String toString() =>
      'OfflineSyncService(pending: $_pendingOperations, '
      'failed: ${_failedOperations.length})';
}
