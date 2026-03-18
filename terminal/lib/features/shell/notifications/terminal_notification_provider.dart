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
    // Start with empty list - notifications are added in real-time
    return [];
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