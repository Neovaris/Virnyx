import 'package:flutter/material.dart';
import '../../core/constants/colors.dart';

import '../../shared/services/connectivity_service.dart';
import '../../shared/services/offline_sync_service.dart';

/// Widget that displays offline/sync status at the bottom of the screen.
/// Shows when offline and while syncing operations.
class OfflineStatusBar extends StatelessWidget {
  const OfflineStatusBar({super.key});

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: Listenable.merge([
        ConnectivityService.instance,
        OfflineSyncService.instance,
      ]),
      builder: (BuildContext context, Widget? child) {
        final ConnectivityService connectivity = ConnectivityService.instance;
        final OfflineSyncService sync = OfflineSyncService.instance;

        // Only show if offline or syncing
        if (connectivity.isOnline &&
            !sync.isSyncing &&
            sync.pendingOperations == 0) {
          return const SizedBox.shrink();
        }

        if (connectivity.isOffline) {
          return _buildOfflineBar();
        }

        if (sync.isSyncing) {
          return _buildSyncingBar(sync.pendingOperations);
        }

        if (sync.pendingOperations > 0) {
          return _buildPendingBar(sync.pendingOperations);
        }

        return const SizedBox.shrink();
      },
    );
  }

  Widget _buildOfflineBar() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.fromLTRB(12, 8, 12, 8),
      decoration: BoxDecoration(
        color: AppColors.dangerRed.withValues(alpha: 0.9),
        border: const Border(top: BorderSide(color: AppColors.dangerRedDark)),
      ),
      child: Row(
        children: [
          const Icon(Icons.cloud_off_rounded, color: Colors.white, size: 18),
          const SizedBox(width: 8),
          const Expanded(
            child: Text(
              'You are offline. Changes will sync when online.',
              style: TextStyle(
                color: Colors.white,
                fontSize: 13,
                fontWeight: FontWeight.w600,
              ),
              overflow: TextOverflow.ellipsis,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSyncingBar(int pendingCount) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.fromLTRB(12, 8, 12, 8),
      decoration: BoxDecoration(
        color: AppColors.infoBlue.withValues(alpha: 0.9),
        border: const Border(top: BorderSide(color: AppColors.primaryBlueDark)),
      ),
      child: Row(
        children: [
          SizedBox(
            width: 18,
            height: 18,
            child: CircularProgressIndicator(
              strokeWidth: 2,
              valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
            ),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              'Syncing $pendingCount operation${pendingCount != 1 ? 's' : ''}...',
              style: const TextStyle(
                color: Colors.white,
                fontSize: 13,
                fontWeight: FontWeight.w600,
              ),
              overflow: TextOverflow.ellipsis,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPendingBar(int pendingCount) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.fromLTRB(12, 8, 12, 8),
      decoration: BoxDecoration(
        color: AppColors.warningAmber.withValues(alpha: 0.9),
        border: const Border(
          top: BorderSide(color: AppColors.warningAmberDark),
        ),
      ),
      child: Row(
        children: [
          const Icon(Icons.schedule_rounded, color: Colors.white, size: 18),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              '$pendingCount pending operation${pendingCount != 1 ? 's' : ''} - waiting to sync',
              style: const TextStyle(
                color: Colors.white,
                fontSize: 13,
                fontWeight: FontWeight.w600,
              ),
              overflow: TextOverflow.ellipsis,
            ),
          ),
        ],
      ),
    );
  }
}

/// Bar positioned at bottom of screen scaffold
class OfflineStatusBottomBar extends StatelessWidget {
  const OfflineStatusBottomBar({super.key});

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: Listenable.merge([
        ConnectivityService.instance,
        OfflineSyncService.instance,
      ]),
      builder: (BuildContext context, Widget? child) {
        final ConnectivityService connectivity = ConnectivityService.instance;
        final OfflineSyncService sync = OfflineSyncService.instance;

        if (connectivity.isOnline &&
            !sync.isSyncing &&
            sync.pendingOperations == 0) {
          return const SizedBox.shrink();
        }

        return Padding(
          padding: const EdgeInsets.only(bottom: 12),
          child: OfflineStatusBar(),
        );
      },
    );
  }
}
