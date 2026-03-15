import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'terminal_notification_models.dart';

// Simple provider for managing notification center visibility
class _NotificationCenterState extends Notifier<bool> {
  @override
  bool build() {
    return false; // Initially closed
  }

  void toggle() {
    state = !state;
  }

  void open() {
    state = true;
  }

  void close() {
    state = false;
  }
}

final terminalNotificationCenterOpenProvider =
    NotifierProvider<_NotificationCenterState, bool>(
  _NotificationCenterState.new,
);

final terminalNotificationsProvider = NotifierProvider<
    TerminalNotificationsNotifier, List<TerminalNotificationItem>>(
  TerminalNotificationsNotifier.new,
);

class TerminalNotificationsNotifier
    extends Notifier<List<TerminalNotificationItem>> {
  @override
  List<TerminalNotificationItem> build() {
    return [
      TerminalNotificationItem(
        id: '1',
        title: 'Software update available.',
        type: TerminalNotificationType.info,
        actionLabel: 'View',
        createdAt: DateTime.now().subtract(const Duration(days: 1)),
      ),
      TerminalNotificationItem(
        id: '2',
        title: 'Offline sync completed successfully.',
        type: TerminalNotificationType.success,
        actionLabel: 'Details',
        createdAt: DateTime.now().subtract(const Duration(hours: 5)),
      ),
      TerminalNotificationItem(
        id: '3',
        title: 'Terminal entered offline mode.',
        type: TerminalNotificationType.warning,
        actionLabel: 'Check',
        createdAt: DateTime.now().subtract(const Duration(minutes: 45)),
      ),
    ];
  }

  void dismissAll() {
    state = [];
  }

  void markAllRead() {
    state = [
      for (final item in state) item.copyWith(read: true),
    ];
  }

  void remove(String id) {
    state = state.where((item) => item.id != id).toList();
  }

  void add(TerminalNotificationItem item) {
    state = [item, ...state];
  }
}