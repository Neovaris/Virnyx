import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../shell/notifications/terminal_notification_models.dart';
import '../../shell/notifications/terminal_notification_provider.dart';
import '../../../core/api/api_provider.dart';

/// Service that monitors refund status and triggers notifications
class RefundNotificationService {
  final Ref ref;

  RefundNotificationService(this.ref);

  /// Start monitoring a refund for approval and show notification
  Future<void> watchRefundForApproval(String refundId, String saleId) async {
    // Poll refund status every 5 seconds
    _startPolling(refundId, saleId);
  }

  /// Stop monitoring a refund
  void stopWatchingRefund(String refundId) {
    // Polling will stop naturally when refund is no longer pending
  }

  /// Poll refund status for changes
  Future<void> _startPolling(String refundId, String saleId) async {
    final client = ref.read(apiProvider);
    String lastStatus = 'PENDING_APPROVAL';
    const pollInterval = Duration(seconds: 3); // Poll every 3 seconds

    // Loop indefinitely - stop only when refund is resolved
    while (true) {
      await Future.delayed(pollInterval);

      try {
        final response = await client.getJson('/refunds/$refundId');
        if (response == null) continue;

        /// Handle both 'status' and 'approvalStatus' field names
        final currentStatus = 
            (response['refund']?['approvalStatus'] ?? 
             response['refund']?['status'] ?? 
             response['approvalStatus'] ?? 
             response['status'] ?? 
             'PENDING_APPROVAL')
            .toString()
            .toUpperCase();

        // If status changed from pending to resolved (approved/rejected)
        if (lastStatus == 'PENDING_APPROVAL' && currentStatus != 'PENDING_APPROVAL') {
          if (currentStatus == 'APPROVED') {
            _addApprovedNotification(refundId, saleId);
          } else if (currentStatus == 'REJECTED') {
            _addRejectedNotification(refundId, saleId);
          }
          break; // Stop polling once resolved
        }

        lastStatus = currentStatus;
      } catch (e) {
        if (kDebugMode) print('Error polling refund $refundId: $e');
        // Continue polling even on error
      }
    }
  }

  /// Add notification when refund is approved
  void _addApprovedNotification(String refundId, String saleId) {
    final notificationsNotifier = ref.read(terminalNotificationsProvider.notifier);
    final notificationCenterNotifier = ref.read(terminalNotificationCenterOpenProvider.notifier);

    final notification = TerminalNotificationItem(
      id: refundId, // Use refund ID as notification ID for tracking
      title: '✅ Refund Approved\nSale: ${saleId.substring(0, 8)}',
      type: TerminalNotificationType.success,
      createdAt: DateTime.now(),
      actionLabel: 'View Details',
    );

    notificationsNotifier.add(notification);
    // Optionally open notification center to show the notification
    notificationCenterNotifier.open();

    // Keep notification visible longer - 15 seconds before auto-dismiss
    Future.delayed(const Duration(seconds: 15), () {
      try {
        notificationsNotifier.remove(notification.id);
      } catch (_) {}
    });
  }

  /// Add notification when refund is rejected
  void _addRejectedNotification(String refundId, String saleId) {
    final notificationsNotifier = ref.read(terminalNotificationsProvider.notifier);
    final notificationCenterNotifier = ref.read(terminalNotificationCenterOpenProvider.notifier);

    final notification = TerminalNotificationItem(
      id: refundId, // Use refund ID as notification ID for tracking
      title: '❌ Refund Rejected\nSale: ${saleId.substring(0, 8)}',
      type: TerminalNotificationType.warning,
      createdAt: DateTime.now(),
      actionLabel: 'View Details',
    );

    notificationsNotifier.add(notification);
    // Open notification center to show the notification
    notificationCenterNotifier.open();

    // Keep rejected notifications visible longer (15 seconds)
    Future.delayed(const Duration(seconds: 15), () {
      try {
        notificationsNotifier.remove(notification.id);
      } catch (_) {}
    });
  }
}

/// Provider for the refund notification service
final refundNotificationServiceProvider = Provider<RefundNotificationService>((ref) {
  return RefundNotificationService(ref);
});
