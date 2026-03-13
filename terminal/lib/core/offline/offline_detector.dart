// lib/core/offline/offline_detector.dart
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

final offlineDetectorProvider = NotifierProvider<OfflineDetector, bool>(
  OfflineDetector.new,
);

class OfflineDetector extends Notifier<bool> {
  late Connectivity _connectivity;

  @override
  bool build() {
    _connectivity = Connectivity();
    _initConnectivityListener();
    return false; // Assume online initially
  }

  void _initConnectivityListener() {
    _connectivity.onConnectivityChanged.listen((result) {
      final isOffline = result.contains(ConnectivityResult.none);
      state = isOffline;
    });
  }

  Future<bool> checkConnectivity() async {
    final result = await _connectivity.checkConnectivity();
    final isOffline = result.contains(ConnectivityResult.none);
    state = isOffline;
    return !isOffline;
  }
}
